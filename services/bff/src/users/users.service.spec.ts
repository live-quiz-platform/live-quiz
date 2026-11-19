import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { IdentityClient } from '../identity/identity.client';
import { AccessTokenVerifier } from './access-token.verifier';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const identityClient: jest.Mocked<IdentityClient> = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  const accessTokenVerifier = {
    verifyAuthorizationHeader: jest.fn(),
  } as unknown as AccessTokenVerifier;

  const service = new UsersService(identityClient, accessTokenVerifier);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user through the identity client', async () => {
    identityClient.register.mockResolvedValue({
      userId: 'user-1',
      email: 'student@example.com',
      displayName: 'Student',
    });

    await expect(
      service.register({
        email: 'student@example.com',
        password: 'password1',
        displayName: 'Student',
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      email: 'student@example.com',
      displayName: 'Student',
    });

    expect(identityClient.register).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password1',
      displayName: 'Student',
    });
  });

  it('propagates identity conflicts', async () => {
    identityClient.register.mockRejectedValue(
      new ConflictException('email: already exists'),
    );

    await expect(
      service.register({
        email: 'student@example.com',
        password: 'password1',
        displayName: 'Student',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in through the identity client', async () => {
    identityClient.login.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'user-1',
      role: 'student',
      expiresAt: 1_700_000_000,
      refreshExpiresAt: 1_700_100_000,
    });

    await expect(
      service.login({
        email: 'student@example.com',
        password: 'password1',
      }),
    ).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 'user-1',
      role: 'student',
      expiresAt: 1_700_000_000,
      refreshExpiresAt: 1_700_100_000,
    });

    expect(identityClient.login).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password1',
    });
  });

  it('propagates login unauthorized errors', async () => {
    identityClient.login.mockRejectedValue(
      new UnauthorizedException('invalid email or password'),
    );

    await expect(
      service.login({
        email: 'student@example.com',
        password: 'password1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens through the identity client', async () => {
    identityClient.refreshToken.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      userId: 'user-1',
      role: 'student',
      expiresAt: 1_700_200_000,
      refreshExpiresAt: 1_700_300_000,
    });

    await expect(
      service.refresh({ refreshToken: 'old-refresh' }),
    ).resolves.toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      userId: 'user-1',
      role: 'student',
      expiresAt: 1_700_200_000,
      refreshExpiresAt: 1_700_300_000,
    });

    expect(identityClient.refreshToken).toHaveBeenCalledWith({
      refreshToken: 'old-refresh',
    });
  });

  it('logs out through the identity client', async () => {
    identityClient.logout.mockResolvedValue({ success: true });

    await expect(
      service.logout({ refreshToken: 'refresh-token' }),
    ).resolves.toEqual({ success: true });

    expect(identityClient.logout).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
    });
  });

  it('returns the current user from a valid access token', () => {
    (
      accessTokenVerifier.verifyAuthorizationHeader as jest.Mock
    ).mockReturnValue({
      userId: 'user-1',
      role: 'professor',
    });

    expect(service.me('Bearer token')).toEqual({
      userId: 'user-1',
      role: 'professor',
    });

    expect(accessTokenVerifier.verifyAuthorizationHeader).toHaveBeenCalledWith(
      'Bearer token',
    );
  });
});
