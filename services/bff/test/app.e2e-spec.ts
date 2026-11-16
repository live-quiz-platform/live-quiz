import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { IDENTITY_CLIENT } from '../src/identity/identity.client';

describe('BFF skeleton (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IDENTITY_CLIENT)
      .useValue({
        register: jest.fn(),
      })
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

  it('GET /api/health returns ok', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', service: 'bff' });
  });

  it('keeps login and me as not implemented stubs', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({}).expect(501);
    await request(app.getHttpServer()).get('/api/me').expect(501);
  });

  it('keeps quiz-bank routes as not implemented stubs', async () => {
    await request(app.getHttpServer()).get('/api/questions').expect(501);
    await request(app.getHttpServer()).post('/api/questions').send({}).expect(501);
    await request(app.getHttpServer()).get('/api/quizzes/demo').expect(501);
    await request(app.getHttpServer()).post('/api/quizzes').send({}).expect(501);
  });
});
