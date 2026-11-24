import type { Logger } from '../../../../../shared/application/logger.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { PhotoUrl } from '../../../domain/value-objects/photo-url.vo.js';
import type { UserPhotoFile, UserPhotoStorage } from '../../ports/user-photo-storage.port.js';
import type { UpdateUserProfileOutput } from '../update-user-profile/update-user-profile.output.js';

export interface ChangeUserPhotoInput {
  userId: string;
  // null remove a foto atual.
  file: UserPhotoFile | null;
}

// Troca ou remove a foto de perfil. A foto nova só fica no disco se o
// usuário for salvo; a antiga só sai do disco depois disso.
export class ChangeUserPhotoUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: UserPhotoStorage,
    private readonly logger: Logger,
  ) {}

  async execute(input: ChangeUserPhotoInput): Promise<UpdateUserProfileOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new UserNotFoundError();

    const previousUrl = user.photoUrl?.value ?? null;
    const newUrl = input.file ? await this.storage.store(input.file) : null;

    try {
      user.changePhoto(newUrl === null ? null : PhotoUrl.create(newUrl));
      await this.users.save(user);
    } catch (error) {
      if (newUrl !== null) await this.removeQuietly(newUrl, user.id);
      throw error;
    }

    if (previousUrl !== null && previousUrl !== newUrl) {
      await this.removeQuietly(previousUrl, user.id);
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email.value,
      phone: user.phone?.value ?? null,
      photoUrl: user.photoUrl?.value ?? null,
      emailVerified: user.emailVerified,
      status: user.status,
    };
  }

  // Um arquivo que sobrou no disco não deve desfazer uma troca já salva.
  private async removeQuietly(photoUrl: string, userId: string): Promise<void> {
    try {
      await this.storage.remove(photoUrl);
    } catch (error) {
      this.logger.error(`Falha ao apagar a foto ${photoUrl} do usuário ${userId}.`, error);
    }
  }
}
