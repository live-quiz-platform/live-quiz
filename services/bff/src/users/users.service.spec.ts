import { ConflictException, NotImplementedException } from '@nestjs/common';
import { IdentityClient } from '../identity/identity.client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const identityClient: jest.Mocked<IdentityClient> = {
    register: jest.fn(),
  };

  const service = new UsersService(identityClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user through the identity client', async () => {
    identityClient.register.mockResolvedValue({
      userId: 'user-1',
      email: 'student@example.com',
      displayName: 'Student',
    });

    await expect(
      service.register({
        email: 'student@example.com',
        password: 'password1',
        displayName: 'Student',
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      email: 'student@example.com',
      displayName: 'Student',
    });

    expect(identityClient.register).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password1',
      displayName: 'Student',
    });
  });

  it('propagates identity conflicts', async () => {
    identityClient.register.mockRejectedValue(
      new ConflictException('email: already exists'),
    );

    await expect(
      service.register({
        email: 'student@example.com',
        password: 'password1',
        displayName: 'Student',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps login and me unimplemented for now', () => {
    expect(() => service.login({})).toThrow(NotImplementedException);
    expect(() => service.me()).toThrow(NotImplementedException);
  });
});
