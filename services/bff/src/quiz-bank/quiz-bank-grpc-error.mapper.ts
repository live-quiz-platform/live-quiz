import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  PreconditionFailedException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { status as GrpcStatus, ServiceError } from '@grpc/grpc-js';

export function mapQuizBankGrpcError(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const grpcError = error as Partial<ServiceError>;
  const message = grpcError.details || grpcError.message || 'quiz-bank request failed';

  switch (grpcError.code) {
    case GrpcStatus.INVALID_ARGUMENT:
      throw new BadRequestException(message);
    case GrpcStatus.NOT_FOUND:
      throw new NotFoundException(message);
    case GrpcStatus.ALREADY_EXISTS:
      throw new ConflictException(message);
    case GrpcStatus.FAILED_PRECONDITION:
      throw new PreconditionFailedException(message);
    case GrpcStatus.UNAUTHENTICATED:
      throw new UnauthorizedException(message);
    case GrpcStatus.PERMISSION_DENIED:
      throw new ForbiddenException(message);
    case GrpcStatus.UNAVAILABLE:
      throw new ServiceUnavailableException('quiz-bank service unavailable');
    default:
      throw new BadGatewayException('quiz-bank service error');
  }
}
