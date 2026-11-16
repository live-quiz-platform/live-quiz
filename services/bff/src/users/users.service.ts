import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import {
  IDENTITY_CLIENT,
  IdentityClient,
} from '../identity/identity.client';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(IDENTITY_CLIENT) private readonly identityClient: IdentityClient,
  ) {}

  register(dto: RegisterDto) {
    return this.identityClient.register({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });
  }

  login(_body: unknown): never {
    throw new NotImplementedException('POST /api/auth/login');
  }

  me(): never {
    throw new NotImplementedException('GET /api/me');
  }
}
