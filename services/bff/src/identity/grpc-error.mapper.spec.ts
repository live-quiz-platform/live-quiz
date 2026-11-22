import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { mapIdentityGrpcError } from './grpc-error.mapper';

describe('mapIdentityGrpcError', () => {
  it('maps INVALID_ARGUMENT to 400', () => {
    expect(() =>
      mapIdentityGrpcError({
        code: GrpcStatus.INVALID_ARGUMENT,
        details: 'email: invalid format',
      }),
    ).toThrow(BadRequestException);
  });

  it('maps ALREADY_EXISTS to 409', () => {
    expect(() =>
      mapIdentityGrpcError({
        code: GrpcStatus.ALREADY_EXISTS,
        details: 'email: already exists',
      }),
    ).toThrow(ConflictException);
  });

  it('maps UNAUTHENTICATED to 401', () => {
    expect(() =>
      mapIdentityGrpcError({
        code: GrpcStatus.UNAUTHENTICATED,
        details: 'invalid email or password',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('maps UNAVAILABLE to 503', () => {
    expect(() =>
      mapIdentityGrpcError({
        code: GrpcStatus.UNAVAILABLE,
        details: 'connection refused',
      }),
    ).toThrow(ServiceUnavailableException);
  });

  it('maps unknown codes to 502', () => {
    expect(() =>
      mapIdentityGrpcError({
        code: GrpcStatus.INTERNAL,
        details: 'registration failed',
      }),
    ).toThrow(BadGatewayException);
  });
});
