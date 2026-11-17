import { Module } from '@nestjs/common';
import { QUIZ_BANK_CLIENT, QuizBankClient } from './quiz-bank.client';
import { QuizBankController } from './quiz-bank.controller';
import { QuizBankService } from './quiz-bank.service';

const unsetQuizBankClient: QuizBankClient = {
  listQuestions: () => Promise.reject(new Error('QUIZ_BANK_CLIENT not wired')),
  createQuestion: () => Promise.reject(new Error('QUIZ_BANK_CLIENT not wired')),
  getQuiz: () => Promise.reject(new Error('QUIZ_BANK_CLIENT not wired')),
  createQuiz: () => Promise.reject(new Error('QUIZ_BANK_CLIENT not wired')),
};

@Module({
  controllers: [QuizBankController],
  providers: [
    QuizBankService,
    {
      provide: QUIZ_BANK_CLIENT,
      useValue: unsetQuizBankClient,
    },
  ],
})
export class QuizBankModule {}
