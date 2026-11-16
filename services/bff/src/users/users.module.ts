import { Module } from '@nestjs/common';
import { GrpcIdentityClient } from '../identity/grpc-identity.client';
import { IDENTITY_CLIENT } from '../identity/identity.client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: IDENTITY_CLIENT,
      useClass: GrpcIdentityClient,
    },
  ],
})
export class UsersModule {}
