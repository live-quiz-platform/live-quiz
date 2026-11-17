import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {
  AnswerOption,
  CallerIdentity,
  CreateQuestionInput,
  CreateQuizInput,
  Difficulty,
  Question,
  QuestionList,
  QuestionType,
  Quiz,
  QuizBankClient,
  QuizQuestion,
  QuizSettings,
} from './quiz-bank.client';
import { mapQuizBankGrpcError } from './quiz-bank-grpc-error.mapper';

type GrpcUnary<TReq, TRes> = (
  request: TReq,
  metadata: grpc.Metadata,
  callback: (error: grpc.ServiceError | null, response: TRes) => void,
) => void;

type QuestionServiceClient = {
  listQuestions: GrpcUnary<
    { page?: number; pageSize?: number },
    { questions: ProtoQuestion[]; total: number }
  >;
  createQuestion: GrpcUnary<
    Record<string, unknown>,
    { question: ProtoQuestion }
  >;
  close: () => void;
};

type QuizServiceClient = {
  getQuiz: GrpcUnary<{ id: string }, { quiz: ProtoQuiz }>;
  createQuiz: GrpcUnary<Record<string, unknown>, { quiz: ProtoQuiz }>;
  close: () => void;
};

type ProtoOption = {
  id?: string;
  text?: string;
  isCorrect?: boolean;
};

type ProtoQuestion = {
  id?: string;
  ownerId?: string;
  type?: string | number;
  text?: string;
  options?: ProtoOption[];
  difficulty?: string | number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type ProtoQuizQuestion = {
  position?: number;
  sourceQuestionId?: string;
  type?: string | number;
  text?: string;
  options?: ProtoOption[];
  difficulty?: string | number;
  tags?: string[];
};

type ProtoQuiz = {
  id?: string;
  ownerId?: string;
  title?: string;
  questions?: ProtoQuizQuestion[];
  settings?: {
    timePerQuestionSeconds?: number;
    speedBonusEnabled?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

@Injectable()
export class GrpcQuizBankClient implements QuizBankClient, OnModuleDestroy {
  private readonly logger = new Logger(GrpcQuizBankClient.name);
  private questionClient?: QuestionServiceClient;
  private quizClient?: QuizServiceClient;

  constructor(private readonly config: ConfigService) {}

  listQuestions(
    identity: CallerIdentity,
    page = 1,
    pageSize = 20,
  ): Promise<QuestionList> {
    const client = this.getQuestionClient();
    return this.call(() =>
      this.unary(client, client.listQuestions, identity, {
        page,
        pageSize,
      }),
    ).then((response) => ({
      questions: (response.questions ?? []).map((question) =>
        this.toQuestion(question),
      ),
      total: Number(response.total ?? 0),
    }));
  }

  createQuestion(
    identity: CallerIdentity,
    input: CreateQuestionInput,
  ): Promise<Question> {
    const client = this.getQuestionClient();
    return this.call(() =>
      this.unary(client, client.createQuestion, identity, {
        type: this.toProtoQuestionType(input.type),
        text: input.text,
        options: input.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        difficulty: input.difficulty
          ? this.toProtoDifficulty(input.difficulty)
          : 'DIFFICULTY_UNSPECIFIED',
        tags: input.tags ?? [],
      }),
    ).then((response) => this.toQuestion(response.question));
  }

  getQuiz(identity: CallerIdentity, quizId: string): Promise<Quiz> {
    const client = this.getQuizClient();
    return this.call(() =>
      this.unary(client, client.getQuiz, identity, { id: quizId }),
    ).then((response) => this.toQuiz(response.quiz));
  }

  createQuiz(identity: CallerIdentity, input: CreateQuizInput): Promise<Quiz> {
    const request: Record<string, unknown> = {
      title: input.title,
      questionIds: input.questionIds,
    };

    if (input.settings) {
      request.settings = {
        timePerQuestionSeconds: input.settings.timePerQuestionSeconds ?? 30,
        speedBonusEnabled: input.settings.speedBonusEnabled ?? false,
      };
    }

    const client = this.getQuizClient();
    return this.call(() =>
      this.unary(client, client.createQuiz, identity, request),
    ).then((response) => this.toQuiz(response.quiz));
  }

  onModuleDestroy() {
    this.questionClient?.close();
    this.quizClient?.close();
  }

  private async call<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      mapQuizBankGrpcError(error);
    }
  }

  private unary<TReq, TRes>(
    client: object,
    method: GrpcUnary<TReq, TRes>,
    identity: CallerIdentity,
    request: TReq,
  ): Promise<TRes> {
    const metadata = new grpc.Metadata();
    metadata.set('x-user-id', identity.userId);
    metadata.set('x-user-role', this.toQuizBankRole(identity.role));

    return new Promise((resolvePromise, reject) => {
      method.call(client, request, metadata, (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        resolvePromise(response);
      });
    });
  }

  private getQuestionClient(): QuestionServiceClient {
    this.ensureClients();
    return this.questionClient!;
  }

  private getQuizClient(): QuizServiceClient {
    this.ensureClients();
    return this.quizClient!;
  }

  private ensureClients() {
    if (this.questionClient && this.quizClient) {
      return;
    }

    const url = this.config.getOrThrow<string>('QUIZ_BANK_GRPC_URL');
    const protoRoot = this.resolveProtoRoot();
    const loaderOptions: protoLoader.Options = {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [protoRoot],
    };

    const questionPackage = grpc.loadPackageDefinition(
      protoLoader.loadSync(
        join(protoRoot, 'question_bank/v1/question_bank.proto'),
        loaderOptions,
      ),
    ) as unknown as {
      question_bank: {
        v1: {
          QuestionService: new (
            address: string,
            credentials: grpc.ChannelCredentials,
          ) => QuestionServiceClient;
        };
      };
    };

    const quizPackage = grpc.loadPackageDefinition(
      protoLoader.loadSync(join(protoRoot, 'quiz/v1/quiz.proto'), loaderOptions),
    ) as unknown as {
      quiz: {
        v1: {
          QuizService: new (
            address: string,
            credentials: grpc.ChannelCredentials,
          ) => QuizServiceClient;
        };
      };
    };

    const credentials = grpc.credentials.createInsecure();
    this.questionClient = new questionPackage.question_bank.v1.QuestionService(
      url,
      credentials,
    );
    this.quizClient = new quizPackage.quiz.v1.QuizService(url, credentials);
    this.logger.log(`Quiz-bank gRPC clients ready (${url})`);
  }

  private resolveProtoRoot(): string {
    const configured = this.config.get<string>('QUIZ_BANK_PROTO_ROOT');
    const candidates = [
      configured ? resolve(process.cwd(), configured) : undefined,
      resolve(process.cwd(), 'proto'),
      resolve(process.cwd(), '../../proto'),
      join(__dirname, '../../../../proto'),
      join(__dirname, '../../../proto'),
    ].filter((value): value is string => Boolean(value));

    const protoRoot = candidates.find((candidate) =>
      existsSync(join(candidate, 'question_bank/v1/question_bank.proto')),
    );

    if (!protoRoot) {
      throw new Error(
        `quiz-bank proto root not found; checked: ${candidates.join(', ')}`,
      );
    }

    return protoRoot;
  }

  private toQuizBankRole(role: string): string {
    const normalized = role.trim().toUpperCase();
    if (normalized === 'PROFESSOR' || normalized === 'TEACHER') {
      return 'TEACHER';
    }
    return normalized;
  }

  private toProtoQuestionType(type: QuestionType): string {
    return `QUESTION_TYPE_${type}`;
  }

  private toProtoDifficulty(difficulty: Difficulty): string {
    return `DIFFICULTY_${difficulty}`;
  }

  private fromProtoQuestionType(value: string | number | undefined): QuestionType {
    const normalized = String(value ?? '')
      .replace(/^QUESTION_TYPE_/, '')
      .toUpperCase();
    if (normalized === 'TRUE_FALSE') {
      return 'TRUE_FALSE';
    }
    return 'SINGLE_CHOICE';
  }

  private fromProtoDifficulty(
    value: string | number | undefined,
  ): Difficulty | undefined {
    const normalized = String(value ?? '')
      .replace(/^DIFFICULTY_/, '')
      .toUpperCase();
    if (
      normalized === 'EASY' ||
      normalized === 'MEDIUM' ||
      normalized === 'HARD'
    ) {
      return normalized;
    }
    return undefined;
  }

  private toOption(option: ProtoOption): AnswerOption {
    return {
      id: option.id,
      text: option.text ?? '',
      isCorrect: Boolean(option.isCorrect),
    };
  }

  private toQuestion(question: ProtoQuestion): Question {
    return {
      id: question.id ?? '',
      ownerId: question.ownerId ?? '',
      type: this.fromProtoQuestionType(question.type),
      text: question.text ?? '',
      options: (question.options ?? []).map((option) => this.toOption(option)),
      difficulty: this.fromProtoDifficulty(question.difficulty),
      tags: question.tags ?? [],
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
  }

  private toQuizQuestion(question: ProtoQuizQuestion): QuizQuestion {
    return {
      position: Number(question.position ?? 0),
      sourceQuestionId: question.sourceQuestionId ?? '',
      type: this.fromProtoQuestionType(question.type),
      text: question.text ?? '',
      options: (question.options ?? []).map((option) => this.toOption(option)),
      difficulty: this.fromProtoDifficulty(question.difficulty),
      tags: question.tags ?? [],
    };
  }

  private toQuiz(quiz: ProtoQuiz): Quiz {
    const settings: QuizSettings = {
      timePerQuestionSeconds: Number(
        quiz.settings?.timePerQuestionSeconds ?? 30,
      ),
      speedBonusEnabled: Boolean(quiz.settings?.speedBonusEnabled),
    };

    return {
      id: quiz.id ?? '',
      ownerId: quiz.ownerId ?? '',
      title: quiz.title ?? '',
      questions: (quiz.questions ?? []).map((question) =>
        this.toQuizQuestion(question),
      ),
      settings,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }
}
