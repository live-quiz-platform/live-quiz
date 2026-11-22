import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import {
  IDENTITY_CLIENT,
  IdentityClient,
} from '../src/identity/identity.client';

describe('POST /api/auth/login (e2e)', () => {
  let app: INestApplication;
  const identityClient: jest.Mocked<IdentityClient> = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IDENTITY_CLIENT)
      .useValue(identityClient)
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
  });

  it('logs in through identity and returns 200', async () => {
    identityClient.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      userId: 'user-123',
      role: 'student',
      expiresAt: 1_700_000_000,
      refreshExpiresAt: 1_700_100_000,
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'password1',
      })
      .expect(200);

    expect(response.body).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      userId: 'user-123',
      role: 'student',
      expiresAt: 1_700_000_000,
      refreshExpiresAt: 1_700_100_000,
    });
    expect(identityClient.login).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password1',
    });
  });

  it('rejects invalid payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'not-an-email',
        password: 'short',
      })
      .expect(400);

    expect(identityClient.login).not.toHaveBeenCalled();
  });

  it('maps invalid credentials to 401', async () => {
    identityClient.login.mockRejectedValue(
      new UnauthorizedException('invalid email or password'),
    );

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'password1',
      })
      .expect(401)
      .expect({
        message: 'invalid email or password',
        error: 'Unauthorized',
        statusCode: 401,
      });
  });
});
