import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import {
  CallerIdentity,
  CreateQuestionInput,
  CreateQuizInput,
  QUIZ_BANK_CLIENT,
  QuizBankClient,
} from './quiz-bank.client';

@Injectable()
export class QuizBankService {
  constructor(
    @Inject(QUIZ_BANK_CLIENT) private readonly quizBankClient: QuizBankClient,
  ) {}

  // Desired behavior (covered by unit tests): delegate to quizBankClient.
  // Still NotImplemented until the gRPC wiring commit.
  listQuestions(_identity: CallerIdentity, _page?: number, _pageSize?: number): never {
    throw new NotImplementedException('GET /api/questions');
  }

  createQuestion(_identity: CallerIdentity, _input: CreateQuestionInput): never {
    throw new NotImplementedException('POST /api/questions');
  }

  getQuiz(_identity: CallerIdentity, _quizId: string): never {
    throw new NotImplementedException('GET /api/quizzes/:id');
  }

  createQuiz(_identity: CallerIdentity, _input: CreateQuizInput): never {
    throw new NotImplementedException('POST /api/quizzes');
  }
}
