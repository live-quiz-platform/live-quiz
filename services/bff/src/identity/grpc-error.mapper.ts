import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { status as GrpcStatus, ServiceError } from '@grpc/grpc-js';

export function mapIdentityGrpcError(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const grpcError = error as Partial<ServiceError>;
  const message = grpcError.details || grpcError.message || 'identity request failed';

  switch (grpcError.code) {
    case GrpcStatus.INVALID_ARGUMENT:
      throw new BadRequestException(message);
    case GrpcStatus.ALREADY_EXISTS:
      throw new ConflictException(message);
    case GrpcStatus.UNAUTHENTICATED:
      throw new UnauthorizedException(message);
    case GrpcStatus.UNAVAILABLE:
      throw new ServiceUnavailableException('identity service unavailable');
    default:
      throw new BadGatewayException('identity service error');
  }
}
