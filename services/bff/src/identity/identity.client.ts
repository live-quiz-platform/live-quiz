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

export type LoginInput = {
  email: string;
  password: string;
};

export type RefreshInput = {
  refreshToken: string;
};

export type LogoutInput = {
  refreshToken: string;
};

/** Session payload returned by identity Login / RefreshToken. */
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: string;
  /** Unix seconds */
  expiresAt: number;
  /** Unix seconds */
  refreshExpiresAt: number;
};

export const IDENTITY_CLIENT = Symbol('IDENTITY_CLIENT');

export interface IdentityClient {
  register(input: RegisterInput): Promise<RegisteredUser>;
  login(input: LoginInput): Promise<AuthSession>;
  refreshToken(input: RefreshInput): Promise<AuthSession>;
  logout(input: LogoutInput): Promise<{ success: boolean }>;
}
