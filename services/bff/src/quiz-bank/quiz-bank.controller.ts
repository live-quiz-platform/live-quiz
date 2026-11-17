import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  CreateQuestionInput,
  CreateQuizInput,
} from './quiz-bank.client';
import { QuizBankService } from './quiz-bank.service';

// Temporary until JWT auth lands: quiz-bank requires x-user-id / TEACHER.
const DEV_TEACHER = { userId: 'dev-teacher', role: 'TEACHER' };

@Controller()
export class QuizBankController {
  constructor(private readonly quizBankService: QuizBankService) {}

  @Get('questions')
  listQuestions() {
    return this.quizBankService.listQuestions(DEV_TEACHER);
  }

  @Post('questions')
  createQuestion(@Body() body: CreateQuestionInput) {
    return this.quizBankService.createQuestion(DEV_TEACHER, body);
  }

  @Get('quizzes/:id')
  getQuiz(@Param('id') id: string) {
    return this.quizBankService.getQuiz(DEV_TEACHER, id);
  }

  @Post('quizzes')
  createQuiz(@Body() body: CreateQuizInput) {
    return this.quizBankService.createQuiz(DEV_TEACHER, body);
  }
}
