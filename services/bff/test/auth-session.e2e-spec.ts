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

describe('Auth session routes (e2e)', () => {
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

  it('POST /api/auth/refresh returns a rotated session', async () => {
    identityClient.refreshToken.mockResolvedValue({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      userId: 'user-123',
      role: 'professor',
      expiresAt: 1_700_200_000,
      refreshExpiresAt: 1_700_300_000,
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'refresh-1' })
      .expect(200);

    expect(response.body).toEqual({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      userId: 'user-123',
      role: 'professor',
      expiresAt: 1_700_200_000,
      refreshExpiresAt: 1_700_300_000,
    });
    expect(identityClient.refreshToken).toHaveBeenCalledWith({
      refreshToken: 'refresh-1',
    });
  });

  it('POST /api/auth/refresh maps invalid refresh to 401', async () => {
    identityClient.refreshToken.mockRejectedValue(
      new UnauthorizedException('invalid refresh token'),
    );

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'bad' })
      .expect(401);
  });

  it('POST /api/auth/logout returns success', async () => {
    identityClient.logout.mockResolvedValue({ success: true });

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: 'refresh-1' })
      .expect(200)
      .expect({ success: true });

    expect(identityClient.logout).toHaveBeenCalledWith({
      refreshToken: 'refresh-1',
    });
  });

  it('rejects empty refresh token bodies with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({})
      .expect(400);

    expect(identityClient.refreshToken).not.toHaveBeenCalled();
    expect(identityClient.logout).not.toHaveBeenCalled();
  });
});
