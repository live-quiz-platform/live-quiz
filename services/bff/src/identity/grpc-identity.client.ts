import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {
  IdentityClient,
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

type IdentityServiceClient = {
  register: (
    request: RegisterRequest,
    callback: (
      error: grpc.ServiceError | null,
      response: RegisterResponse,
    ) => void,
  ) => void;
  close: () => void;
};

@Injectable()
export class GrpcIdentityClient implements IdentityClient, OnModuleDestroy {
  private readonly logger = new Logger(GrpcIdentityClient.name);
  private client?: IdentityServiceClient;

  constructor(private readonly config: ConfigService) {}

  async register(input: RegisterInput): Promise<RegisteredUser> {
    try {
      const response = await new Promise<RegisterResponse>(
        (resolvePromise, reject) => {
          this.getClient().register(
            {
              email: input.email,
              password: input.password,
              displayName: input.displayName,
            },
            (error, responseValue) => {
              if (error) {
                reject(error);
                return;
              }
              resolvePromise(responseValue);
            },
          );
        },
      );

      return {
        userId: response.userId,
        email: response.email,
        displayName: response.displayName,
      };
    } catch (error) {
      mapIdentityGrpcError(error);
    }
  }

  onModuleDestroy() {
    this.client?.close();
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
