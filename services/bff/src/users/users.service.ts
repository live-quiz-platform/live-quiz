import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class UsersService {
  // TODO: call users service over gRPC
  login(_body: unknown): never {
    throw new NotImplementedException('POST /api/auth/login');
  }

  // TODO: validate JWT, then call users service over gRPC
  me(): never {
    throw new NotImplementedException('GET /api/me');
  }
}
