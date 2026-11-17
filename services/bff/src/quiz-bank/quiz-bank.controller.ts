import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { ListQuestionsQueryDto } from './dto/list-questions-query.dto';
import { QuizBankService } from './quiz-bank.service';

// Temporary until JWT auth lands: quiz-bank requires x-user-id / TEACHER.
const DEV_TEACHER = { userId: 'dev-teacher', role: 'TEACHER' };

@Controller()
export class QuizBankController {
  constructor(private readonly quizBankService: QuizBankService) {}

  @Get('questions')
  listQuestions(@Query() query: ListQuestionsQueryDto) {
    return this.quizBankService.listQuestions(
      DEV_TEACHER,
      query.page,
      query.pageSize,
    );
  }

  @Post('questions')
  @HttpCode(HttpStatus.CREATED)
  createQuestion(@Body() body: CreateQuestionDto) {
    return this.quizBankService.createQuestion(DEV_TEACHER, {
      type: body.type,
      text: body.text,
      options: body.options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect,
      })),
      difficulty: body.difficulty,
      tags: body.tags,
    });
  }

  @Get('quizzes/:id')
  getQuiz(@Param('id') id: string) {
    return this.quizBankService.getQuiz(DEV_TEACHER, id);
  }

  @Post('quizzes')
  @HttpCode(HttpStatus.CREATED)
  createQuiz(@Body() body: CreateQuizDto) {
    return this.quizBankService.createQuiz(DEV_TEACHER, {
      title: body.title,
      questionIds: body.questionIds,
      settings: body.settings
        ? {
            timePerQuestionSeconds: body.settings.timePerQuestionSeconds,
            speedBonusEnabled: body.settings.speedBonusEnabled,
          }
        : undefined,
    });
  }
}
