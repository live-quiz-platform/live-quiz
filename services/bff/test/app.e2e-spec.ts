import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';


describe('BFF skeleton (e2e)', () => {
  let app: INestApplication;


  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
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

  it('keeps users auth routes as not implemented stubs', async () => {
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
