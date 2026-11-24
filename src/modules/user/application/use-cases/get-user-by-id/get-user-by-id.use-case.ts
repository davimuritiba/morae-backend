import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { GetUserByIdOutput } from './get-user-by-id.output.js';

export class GetUserByIdUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<GetUserByIdOutput> {
    const user = await this.users.findById(userId);

    if (user === null) {
      throw new UserNotFoundError();
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email.value,
      cpf: user.cpf.value,
      profileData: user.profileData,
      phone: user.phone?.value ?? null,
      photoUrl: user.photoUrl?.value ?? null,
      emailVerified: user.emailVerified,
      status: user.status,
    };
  }
}
