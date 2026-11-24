import { Injectable } from '@nestjs/common';
import { PublicImageDirectory } from '../../../../shared/infra/media/public-image-directory.js';
import {
  UserPhotoStorage,
  type UserPhotoFile,
} from '../../application/ports/user-photo-storage.port.js';

// Grava as fotos de perfil em UPLOADS_DIR/users, servidas em /uploads/users.
@Injectable()
export class LocalUserPhotoStorage extends UserPhotoStorage {
  private readonly directory = new PublicImageDirectory('users');

  async store(file: UserPhotoFile): Promise<string> {
    const [url] = await this.directory.save([file]);
    return url;
  }

  async remove(photoUrl: string): Promise<void> {
    await this.directory.remove([photoUrl]);
  }
}
