import {
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { IDENTITY_CLIENT } from '../src/identity/identity.client';
import {
  QUIZ_BANK_CLIENT,
  QuizBankClient,
} from '../src/quiz-bank/quiz-bank.client';

describe('Questions HTTP (e2e)', () => {
  let app: INestApplication;

  const quizBankClient: jest.Mocked<QuizBankClient> = {
    listQuestions: jest.fn(),
    createQuestion: jest.fn(),
    getQuiz: jest.fn(),
    createQuiz: jest.fn(),
  };

  const validCreateBody = {
    type: 'SINGLE_CHOICE',
    text: '2+2?',
    options: [
      { text: '3', isCorrect: false },
      { text: '4', isCorrect: true },
    ],
    difficulty: 'EASY',
    tags: ['math'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IDENTITY_CLIENT)
      .useValue({ register: jest.fn() })
      .overrideProvider(QUIZ_BANK_CLIENT)
      .useValue(quizBankClient)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    quizBankClient.listQuestions.mockReset();
    quizBankClient.createQuestion.mockReset();
    quizBankClient.getQuiz.mockReset();
    quizBankClient.createQuiz.mockReset();
  });

  it('GET /api/questions returns the question list', async () => {
    quizBankClient.listQuestions.mockResolvedValue({
      questions: [
        {
          id: 'q1',
          ownerId: 'dev-teacher',
          type: 'SINGLE_CHOICE',
          text: '2+2?',
          options: [
            { id: 'o1', text: '3', isCorrect: false },
            { id: 'o2', text: '4', isCorrect: true },
          ],
          difficulty: 'EASY',
          tags: ['math'],
        },
      ],
      total: 1,
    });

    const response = await request(app.getHttpServer())
      .get('/api/questions')
      .expect(200);

    expect(response.body).toEqual({
      questions: [
        expect.objectContaining({
          id: 'q1',
          text: '2+2?',
          type: 'SINGLE_CHOICE',
        }),
      ],
      total: 1,
    });
    expect(quizBankClient.listQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'TEACHER' }),
      undefined,
      undefined,
    );
  });

  it('GET /api/questions forwards page and pageSize query params', async () => {
    quizBankClient.listQuestions.mockResolvedValue({
      questions: [],
      total: 0,
    });

    await request(app.getHttpServer())
      .get('/api/questions')
      .query({ page: 2, pageSize: 10 })
      .expect(200);

    expect(quizBankClient.listQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'TEACHER' }),
      2,
      10,
    );
  });

  it('POST /api/questions creates a question and returns 201', async () => {
    quizBankClient.createQuestion.mockResolvedValue({
      id: 'q1',
      ownerId: 'dev-teacher',
      type: 'SINGLE_CHOICE',
      text: '2+2?',
      options: [
        { id: 'o1', text: '3', isCorrect: false },
        { id: 'o2', text: '4', isCorrect: true },
      ],
      difficulty: 'EASY',
      tags: ['math'],
    });

    const response = await request(app.getHttpServer())
      .post('/api/questions')
      .send(validCreateBody)
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'q1',
        text: '2+2?',
        type: 'SINGLE_CHOICE',
      }),
    );
    expect(quizBankClient.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'dev-teacher', role: 'TEACHER' }),
      expect.objectContaining({
        type: 'SINGLE_CHOICE',
        text: '2+2?',
      }),
    );
  });

  it('maps quiz-bank NOT_FOUND to HTTP 404', async () => {
    quizBankClient.createQuestion.mockRejectedValue(
      new NotFoundException('intrebarea nu exista'),
    );

    await request(app.getHttpServer())
      .post('/api/questions')
      .send(validCreateBody)
      .expect(404);
  });

  it('maps quiz-bank ALREADY_EXISTS to HTTP 409', async () => {
    quizBankClient.createQuestion.mockRejectedValue(
      new ConflictException('intrebarea exista deja in quiz'),
    );

    await request(app.getHttpServer())
      .post('/api/questions')
      .send(validCreateBody)
      .expect(409);
  });

  it('rejects invalid create payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/questions')
      .send({
        type: 'SINGLE_CHOICE',
        text: '',
        options: [{ text: 'only-one', isCorrect: true }],
      })
      .expect(400);

    expect(quizBankClient.createQuestion).not.toHaveBeenCalled();
  });
});
