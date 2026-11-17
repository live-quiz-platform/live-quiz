import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
  UnauthorizedException,
} from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { mapQuizBankGrpcError } from './quiz-bank-grpc-error.mapper';

describe('mapQuizBankGrpcError', () => {
  it('maps INVALID_ARGUMENT to 400', () => {
    expect(() =>
      mapQuizBankGrpcError({
        code: GrpcStatus.INVALID_ARGUMENT,
        details: 'title: nu poate fi gol',
      }),
    ).toThrow(BadRequestException);
  });

  it('maps NOT_FOUND to 404', () => {
    expect(() =>
      mapQuizBankGrpcError({
        code: GrpcStatus.NOT_FOUND,
        details: 'intrebarea nu exista',
      }),
    ).toThrow(NotFoundException);
  });

  it('maps ALREADY_EXISTS to 409', () => {
    expect(() =>
      mapQuizBankGrpcError({
        code: GrpcStatus.ALREADY_EXISTS,
        details: 'intrebarea exista deja in quiz',
      }),
    ).toThrow(ConflictException);
  });

  it('maps FAILED_PRECONDITION to 412', () => {
    expect(() =>
      mapQuizBankGrpcError({
        code: GrpcStatus.FAILED_PRECONDITION,
        details: 'quiz-ul trebuie sa pastreze cel putin o intrebare',
      }),
    ).toThrow(PreconditionFailedException);
  });

  it('maps UNAUTHENTICATED to 401', () => {
    expect(() =>
      mapQuizBankGrpcError({
        code: GrpcStatus.UNAUTHENTICATED,
        details: 'lipsesc x-user-id sau x-user-role',
      }),
    ).toThrow(UnauthorizedException);
  });

  it('maps PERMISSION_DENIED to 403', () => {
    expect(() =>
      mapQuizBankGrpcError({
        code: GrpcStatus.PERMISSION_DENIED,
        details: 'acces permis doar profesorilor',
      }),
    ).toThrow(ForbiddenException);
  });
});
