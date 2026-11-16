import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class QuizBankService {
  // TODO: call quiz-bank service over gRPC
  listQuestions(): never {
    throw new NotImplementedException('GET /api/questions');
  }

  createQuestion(_body: unknown): never {
    throw new NotImplementedException('POST /api/questions');
  }

  getQuiz(_id: string): never {
    throw new NotImplementedException('GET /api/quizzes/:id');
  }

  createQuiz(_body: unknown): never {
    throw new NotImplementedException('POST /api/quizzes');
  }
}
