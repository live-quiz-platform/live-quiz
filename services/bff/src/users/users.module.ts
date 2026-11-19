import { Module } from '@nestjs/common';
import { GrpcIdentityClient } from '../identity/grpc-identity.client';
import { IDENTITY_CLIENT } from '../identity/identity.client';
import { AccessTokenVerifier } from './access-token.verifier';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    AccessTokenVerifier,
    {
      provide: IDENTITY_CLIENT,
      useClass: GrpcIdentityClient,
    },
  ],
})
export class UsersModule {}
