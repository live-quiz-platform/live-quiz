import { Inject, Injectable } from '@nestjs/common';
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

  listQuestions(identity: CallerIdentity, page?: number, pageSize?: number) {
    return this.quizBankClient.listQuestions(identity, page, pageSize);
  }

  createQuestion(identity: CallerIdentity, input: CreateQuestionInput) {
    return this.quizBankClient.createQuestion(identity, input);
  }

  getQuiz(identity: CallerIdentity, quizId: string) {
    return this.quizBankClient.getQuiz(identity, quizId);
  }

  createQuiz(identity: CallerIdentity, input: CreateQuizInput) {
    return this.quizBankClient.createQuiz(identity, input);
  }
}
