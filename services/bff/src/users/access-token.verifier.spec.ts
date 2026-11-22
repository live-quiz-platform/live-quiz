import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { AccessTokenVerifier } from './access-token.verifier';

const SECRET = 'local-development-secret-do-not-use-in-production';

describe('AccessTokenVerifier', () => {
  const config = {
    get: jest.fn((key: string) =>
      key === 'IDENTITY_JWT_SECRET' ? SECRET : undefined,
    ),
  } as unknown as ConfigService;

  const verifier = new AccessTokenVerifier(config);

  function signToken(claims: {
    sub: string;
    role: string;
    expired?: boolean;
  }) {
    return sign(
      { role: claims.role },
      SECRET,
      {
        algorithm: 'HS256',
        subject: claims.sub,
        expiresIn: claims.expired ? -10 : 3600,
      },
    );
  }

  it('verifies a Bearer access token', () => {
    const token = signToken({ sub: 'user-1', role: 'student' });

    expect(verifier.verifyAuthorizationHeader(`Bearer ${token}`)).toEqual({
      userId: 'user-1',
      role: 'student',
    });
  });

  it('rejects missing or malformed Authorization headers', () => {
    expect(() => verifier.verifyAuthorizationHeader(undefined)).toThrow(
      UnauthorizedException,
    );
    expect(() => verifier.verifyAuthorizationHeader('Token abc')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired or tampered tokens', () => {
    const expired = signToken({
      sub: 'user-1',
      role: 'student',
      expired: true,
    });

    expect(() =>
      verifier.verifyAuthorizationHeader(`Bearer ${expired}`),
    ).toThrow(UnauthorizedException);

    expect(() =>
      verifier.verifyAuthorizationHeader('Bearer not-a-jwt'),
    ).toThrow(UnauthorizedException);
  });
});
