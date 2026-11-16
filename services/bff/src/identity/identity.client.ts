export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
};

export type RegisteredUser = {
  userId: string;
  email: string;
  displayName: string;
};

export const IDENTITY_CLIENT = Symbol('IDENTITY_CLIENT');

export interface IdentityClient {
  register(input: RegisterInput): Promise<RegisteredUser>;
}
