import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import {
  IDENTITY_CLIENT,
  IdentityClient,
} from '../src/identity/identity.client';

describe('POST /api/auth/register (e2e)', () => {
  let app: INestApplication;
  const identityClient: jest.Mocked<IdentityClient> = {
    register: jest.fn(),
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

  it('creates a user through identity and returns 201', async () => {
    identityClient.register.mockResolvedValue({
      userId: 'user-123',
      email: 'student@example.com',
      displayName: 'Student',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'student@example.com',
        password: 'password1',
        displayName: 'Student',
      })
      .expect(201);

    expect(response.body).toEqual({
      userId: 'user-123',
      email: 'student@example.com',
      displayName: 'Student',
    });
    expect(identityClient.register).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password1',
      displayName: 'Student',
    });
  });

  it('rejects invalid payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
        displayName: '',
      })
      .expect(400);

    expect(identityClient.register).not.toHaveBeenCalled();
  });

  it('maps identity email conflicts to 409', async () => {
    identityClient.register.mockRejectedValue(
      new ConflictException('email: already exists'),
    );

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'student@example.com',
        password: 'password1',
        displayName: 'Student',
      })
      .expect(409);
  });
});
