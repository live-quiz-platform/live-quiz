import { Module } from '@nestjs/common';
import { GrpcQuizBankClient } from './grpc-quiz-bank.client';
import { QUIZ_BANK_CLIENT } from './quiz-bank.client';
import { QuizBankController } from './quiz-bank.controller';
import { QuizBankService } from './quiz-bank.service';

@Module({
  controllers: [QuizBankController],
  providers: [
    QuizBankService,
    {
      provide: QUIZ_BANK_CLIENT,
      useClass: GrpcQuizBankClient,
    },
  ],
})
export class QuizBankModule {}
