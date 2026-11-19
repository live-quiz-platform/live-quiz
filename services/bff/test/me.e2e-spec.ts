import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { IDENTITY_CLIENT } from '../src/identity/identity.client';

const SECRET = 'local-development-secret-do-not-use-in-production';

describe('GET /api/me (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.IDENTITY_JWT_SECRET = SECRET;

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

  function signToken(role = 'student') {
    return sign({ role }, SECRET, {
      algorithm: 'HS256',
      subject: 'user-123',
      expiresIn: 3600,
    });
  }

  it('returns userId and role from a valid Bearer token', async () => {
    const token = signToken('professor');

    await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ userId: 'user-123', role: 'professor' });
  });

  it('rejects missing or invalid tokens with 401', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);

    await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });
});
