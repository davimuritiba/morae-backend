import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { UserPhotoStorage, type UserPhotoFile } from '../../../application/ports/user-photo-storage.port.js';
import { ChangeUserPhotoUseCase } from '../../../application/use-cases/change-user-photo/change-user-photo.use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { PhotoUrl } from '../../../domain/value-objects/photo-url.vo.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';

const UPLOADED = (n: number) => `/uploads/users/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.png`;

class FakeUserPhotoStorage extends UserPhotoStorage {
  stored: string[] = [];
  removed: string[] = [];
  next = 1;

  async store(_file: UserPhotoFile): Promise<string> {
    const url = UPLOADED(this.next++);
    this.stored.push(url);
    return url;
  }

  async remove(photoUrl: string): Promise<void> {
    this.removed.push(photoUrl);
  }
}

const file: UserPhotoFile = { buffer: Buffer.from('x'), mimetype: 'image/png', size: 1 };

function makeUser(photoUrl: string | null = null) {
  return User.create({
    name: 'Maria Silva',
    email: Email.create('maria@ufal.br'),
    cpf: Cpf.create('529.982.247-25'),
    passwordHash: 'hash',
    photoUrl: photoUrl === null ? null : PhotoUrl.create(photoUrl),
  });
}

describe('ChangeUserPhotoUseCase', () => {
  let users: InMemoryUserRepository;
  let storage: FakeUserPhotoStorage;
  let logger: FakeLogger;
  let sut: ChangeUserPhotoUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    storage = new FakeUserPhotoStorage();
    logger = new FakeLogger();
    sut = new ChangeUserPhotoUseCase(users, storage, logger);
  });

  it('grava a foto nova, salva o usuário e apaga a antiga', async () => {
    const user = makeUser(UPLOADED(99));
    await users.save(user);

    const output = await sut.execute({ userId: user.id, file });

    expect(output.photoUrl).toBe(UPLOADED(1));
    expect((await users.findById(user.id))?.photoUrl?.value).toBe(UPLOADED(1));
    expect(storage.removed).toEqual([UPLOADED(99)]);
  });

  it('remove a foto quando file é null', async () => {
    const user = makeUser('https://lh3.googleusercontent.com/a/foto');
    await users.save(user);

    const output = await sut.execute({ userId: user.id, file: null });

    expect(output.photoUrl).toBeNull();
    expect(storage.stored).toEqual([]);
    // O storage decide se a URL é dele; externas são ignoradas lá.
    expect(storage.removed).toEqual(['https://lh3.googleusercontent.com/a/foto']);
  });

  it('não grava arquivo para usuário inexistente', async () => {
    await expect(
      sut.execute({ userId: '7e60516c-96c4-46fe-988c-3baa1b4bb893', file }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
    expect(storage.stored).toEqual([]);
  });

  it('apaga a foto nova se salvar o usuário falhar', async () => {
    const user = makeUser(UPLOADED(99));
    await users.save(user);
    users.save = async () => {
      throw new Error('banco fora do ar');
    };

    await expect(sut.execute({ userId: user.id, file })).rejects.toThrow('banco fora do ar');
    expect(storage.removed).toEqual([UPLOADED(1)]);
  });

  it('não falha a troca se apagar a foto antiga der erro', async () => {
    const user = makeUser(UPLOADED(99));
    await users.save(user);
    storage.remove = async () => {
      throw new Error('disco');
    };

    const output = await sut.execute({ userId: user.id, file });

    expect(output.photoUrl).toBe(UPLOADED(1));
    expect(logger.errors).toHaveLength(1);
  });
});
