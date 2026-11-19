import { Inject, Injectable } from '@nestjs/common';
import {
  IDENTITY_CLIENT,
  IdentityClient,
} from '../identity/identity.client';
import { AccessTokenVerifier } from './access-token.verifier';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(IDENTITY_CLIENT) private readonly identityClient: IdentityClient,
    private readonly accessTokenVerifier: AccessTokenVerifier,
  ) {}

  register(dto: RegisterDto) {
    return this.identityClient.register({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });
  }

  login(dto: LoginDto) {
    return this.identityClient.login({
      email: dto.email,
      password: dto.password,
    });
  }

  refresh(dto: RefreshTokenDto) {
    return this.identityClient.refreshToken({
      refreshToken: dto.refreshToken,
    });
  }

  logout(dto: LogoutDto) {
    return this.identityClient.logout({
      refreshToken: dto.refreshToken,
    });
  }

  me(authorization?: string) {
    return this.accessTokenVerifier.verifyAuthorizationHeader(authorization);
  }
}
