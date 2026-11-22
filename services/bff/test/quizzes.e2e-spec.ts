import {
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

describe('Quizzes HTTP (e2e)', () => {
  let app: INestApplication;

  const quizBankClient: jest.Mocked<QuizBankClient> = {
    listQuestions: jest.fn(),
    createQuestion: jest.fn(),
    getQuiz: jest.fn(),
    createQuiz: jest.fn(),
  };

  const sampleQuiz = {
    id: 'quiz-1',
    ownerId: 'dev-teacher',
    title: 'Seminar 1',
    questions: [
      {
        position: 1,
        sourceQuestionId: 'q1',
        type: 'SINGLE_CHOICE' as const,
        text: '2+2?',
        options: [
          { id: 'o1', text: '3', isCorrect: false },
          { id: 'o2', text: '4', isCorrect: true },
        ],
        difficulty: 'EASY' as const,
        tags: ['math'],
      },
    ],
    settings: {
      timePerQuestionSeconds: 45,
      speedBonusEnabled: true,
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IDENTITY_CLIENT)
      .useValue({
        register: jest.fn(),
        login: jest.fn(),
        refreshToken: jest.fn(),
        logout: jest.fn(),
      })
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

  it('GET /api/quizzes/:id returns a quiz', async () => {
    quizBankClient.getQuiz.mockResolvedValue(sampleQuiz);

    const response = await request(app.getHttpServer())
      .get('/api/quizzes/quiz-1')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'quiz-1',
        title: 'Seminar 1',
      }),
    );
    expect(quizBankClient.getQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'TEACHER' }),
      'quiz-1',
    );
  });

  it('GET /api/quizzes/:id maps NOT_FOUND to 404', async () => {
    quizBankClient.getQuiz.mockRejectedValue(
      new NotFoundException('quiz-ul nu exista'),
    );

    await request(app.getHttpServer()).get('/api/quizzes/missing').expect(404);
  });

  it('POST /api/quizzes creates a quiz and returns 201', async () => {
    quizBankClient.createQuiz.mockResolvedValue(sampleQuiz);

    const response = await request(app.getHttpServer())
      .post('/api/quizzes')
      .send({
        title: 'Seminar 1',
        questionIds: ['q1'],
        settings: {
          timePerQuestionSeconds: 45,
          speedBonusEnabled: true,
        },
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'quiz-1',
        title: 'Seminar 1',
      }),
    );
    expect(quizBankClient.createQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'dev-teacher', role: 'TEACHER' }),
      expect.objectContaining({
        title: 'Seminar 1',
        questionIds: ['q1'],
      }),
    );
  });

  it('rejects invalid create quiz payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/quizzes')
      .send({
        title: '',
        questionIds: [],
      })
      .expect(400);

    expect(quizBankClient.createQuiz).not.toHaveBeenCalled();
  });
});
