import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { IDENTITY_CLIENT } from '../src/identity/identity.client';
import { QUIZ_BANK_CLIENT } from '../src/quiz-bank/quiz-bank.client';

describe('BFF skeleton (e2e)', () => {
  let app: INestApplication;

  const quizBankClient = {
    listQuestions: jest.fn().mockResolvedValue({ questions: [], total: 0 }),
    createQuestion: jest.fn().mockResolvedValue({
      id: 'q1',
      ownerId: 'dev-teacher',
      type: 'SINGLE_CHOICE',
      text: '2+2?',
      options: [],
      tags: [],
    }),
    getQuiz: jest.fn().mockResolvedValue({
      id: 'demo',
      ownerId: 'dev-teacher',
      title: 'Demo',
      questions: [],
      settings: { timePerQuestionSeconds: 30, speedBonusEnabled: false },
    }),
    createQuiz: jest.fn().mockResolvedValue({
      id: 'quiz-1',
      ownerId: 'dev-teacher',
      title: 'Seminar',
      questions: [],
      settings: { timePerQuestionSeconds: 30, speedBonusEnabled: false },
    }),
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
    jest.clearAllMocks();
    quizBankClient.listQuestions.mockResolvedValue({ questions: [], total: 0 });
  });

  it('GET /api/health returns ok', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', service: 'bff' });
  });

  it('wires quiz-bank list questions through the service layer', async () => {
    await request(app.getHttpServer())
      .get('/api/questions')
      .expect(200)
      .expect({ questions: [], total: 0 });

    expect(quizBankClient.listQuestions).toHaveBeenCalled();
  });
});
