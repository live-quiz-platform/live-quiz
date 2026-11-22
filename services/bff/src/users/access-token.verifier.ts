import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, verify } from 'jsonwebtoken';

export type AccessTokenClaims = {
  userId: string;
  role: string;
};

type IdentityJwtPayload = JwtPayload & {
  role?: unknown;
};

@Injectable()
export class AccessTokenVerifier {
  constructor(private readonly config: ConfigService) {}

  verifyAuthorizationHeader(authorization?: string): AccessTokenClaims {
    const token = this.extractBearerToken(authorization);
    return this.verifyAccessToken(token);
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    const secret = this.config.get<string>('IDENTITY_JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error(
        'IDENTITY_JWT_SECRET is required and must be at least 32 characters',
      );
    }

    try {
      const payload = verify(token, secret, {
        algorithms: ['HS256'],
      }) as IdentityJwtPayload;

      const userId =
        typeof payload.sub === 'string' ? payload.sub.trim() : '';
      const role = typeof payload.role === 'string' ? payload.role.trim() : '';

      if (!userId || !role) {
        throw new UnauthorizedException('invalid access token');
      }

      return { userId, role };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('invalid access token');
    }
  }

  private extractBearerToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('missing access token');
    }

    const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
      throw new UnauthorizedException('invalid authorization header');
    }

    return token;
  }
}
