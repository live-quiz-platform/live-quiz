import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {
  AuthSession,
  IdentityClient,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  RegisteredUser,
} from './identity.client';
import { mapIdentityGrpcError } from './grpc-error.mapper';

type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
};

type RegisterResponse = {
  userId: string;
  email: string;
  displayName: string;
};

type LoginRequest = {
  email: string;
  password: string;
};

type AuthSessionResponse = {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  role?: string;
  expiresAt?: string | number;
  refreshExpiresAt?: string | number;
};

type RefreshTokenRequest = {
  refreshToken: string;
};

type LogoutRequest = {
  refreshToken: string;
};

type LogoutResponse = {
  success?: boolean;
};

type GrpcUnaryNoMeta<TReq, TRes> = (
  request: TReq,
  callback: (error: grpc.ServiceError | null, response: TRes) => void,
) => void;

type IdentityServiceClient = {
  register: GrpcUnaryNoMeta<RegisterRequest, RegisterResponse>;
  login: GrpcUnaryNoMeta<LoginRequest, AuthSessionResponse>;
  refreshToken: GrpcUnaryNoMeta<RefreshTokenRequest, AuthSessionResponse>;
  logout: GrpcUnaryNoMeta<LogoutRequest, LogoutResponse>;
  close: () => void;
};

@Injectable()
export class GrpcIdentityClient implements IdentityClient, OnModuleDestroy {
  private readonly logger = new Logger(GrpcIdentityClient.name);
  private client?: IdentityServiceClient;

  constructor(private readonly config: ConfigService) {}

  async register(input: RegisterInput): Promise<RegisteredUser> {
    try {
      const response = await this.unary(this.getClient().register, {
        email: input.email,
        password: input.password,
        displayName: input.displayName,
      });

      return {
        userId: response.userId,
        email: response.email,
        displayName: response.displayName,
      };
    } catch (error) {
      mapIdentityGrpcError(error);
    }
  }

  async login(input: LoginInput): Promise<AuthSession> {
    try {
      const response = await this.unary(this.getClient().login, {
        email: input.email,
        password: input.password,
      });
      return this.toAuthSession(response);
    } catch (error) {
      mapIdentityGrpcError(error);
    }
  }

  async refreshToken(input: RefreshInput): Promise<AuthSession> {
    try {
      const response = await this.unary(this.getClient().refreshToken, {
        refreshToken: input.refreshToken,
      });
      return this.toAuthSession(response);
    } catch (error) {
      mapIdentityGrpcError(error);
    }
  }

  async logout(input: LogoutInput): Promise<{ success: boolean }> {
    try {
      const response = await this.unary(this.getClient().logout, {
        refreshToken: input.refreshToken,
      });
      return { success: Boolean(response.success) };
    } catch (error) {
      mapIdentityGrpcError(error);
    }
  }

  onModuleDestroy() {
    this.client?.close();
  }

  private unary<TReq, TRes>(
    method: GrpcUnaryNoMeta<TReq, TRes>,
    request: TReq,
  ): Promise<TRes> {
    const client = this.getClient();
    return new Promise((resolvePromise, reject) => {
      method.call(client, request, (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        resolvePromise(response);
      });
    });
  }

  private toAuthSession(response: AuthSessionResponse): AuthSession {
    return {
      accessToken: response.accessToken ?? '',
      refreshToken: response.refreshToken ?? '',
      userId: response.userId ?? '',
      role: response.role ?? '',
      expiresAt: Number(response.expiresAt ?? 0),
      refreshExpiresAt: Number(response.refreshExpiresAt ?? 0),
    };
  }

  private getClient(): IdentityServiceClient {
    if (this.client) {
      return this.client;
    }

    const url = this.config.getOrThrow<string>('IDENTITY_GRPC_URL');
    const protoPath = this.resolveProtoPath();
    const credentials = this.createCredentials();
    const serverName = this.config.get<string>(
      'IDENTITY_TLS_SERVER_NAME',
      'identity',
    );

    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as {
      identity: {
        v1: {
          IdentityService: new (
            address: string,
            credentials: grpc.ChannelCredentials,
            options?: grpc.ChannelOptions,
          ) => IdentityServiceClient;
        };
      };
    };

    this.client = new proto.identity.v1.IdentityService(url, credentials, {
      'grpc.ssl_target_name_override': serverName,
      'grpc.default_authority': serverName,
    });

    this.logger.log(`Identity gRPC client ready (${url})`);
    return this.client;
  }

  private createCredentials(): grpc.ChannelCredentials {
    const caFile = this.config.get<string>('IDENTITY_TLS_CA_FILE');
    if (!caFile) {
      throw new Error('IDENTITY_TLS_CA_FILE is required for identity gRPC TLS');
    }

    return grpc.credentials.createSsl(readFileSync(caFile));
  }

  private resolveProtoPath(): string {
    const configured = this.config.get<string>('IDENTITY_PROTO_PATH');
    const candidates = [
      configured,
      resolve(process.cwd(), 'proto/identity/v1/identity.proto'),
      resolve(process.cwd(), '../../proto/identity/v1/identity.proto'),
      join(__dirname, '../../../../proto/identity/v1/identity.proto'),
      join(__dirname, '../../../proto/identity/v1/identity.proto'),
    ].filter((value): value is string => Boolean(value));

    const protoPath = candidates.find((candidate) => existsSync(candidate));
    if (!protoPath) {
      throw new Error(
        `identity proto not found; checked: ${candidates.join(', ')}`,
      );
    }

    return protoPath;
  }
}
