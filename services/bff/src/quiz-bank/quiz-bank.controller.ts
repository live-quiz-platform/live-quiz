import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuizBankService } from './quiz-bank.service';

@Controller()
export class QuizBankController {
  constructor(private readonly quizBankService: QuizBankService) {}

  @Get('questions')
  listQuestions() {
    return this.quizBankService.listQuestions();
  }

  @Post('questions')
  createQuestion(@Body() body: unknown) {
    return this.quizBankService.createQuestion(body);
  }

  @Get('quizzes/:id')
  getQuiz(@Param('id') id: string) {
    return this.quizBankService.getQuiz(id);
  }

  @Post('quizzes')
  createQuiz(@Body() body: unknown) {
    return this.quizBankService.createQuiz(body);
  }
}
