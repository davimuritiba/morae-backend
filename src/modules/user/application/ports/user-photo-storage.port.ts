// Onde os arquivos de foto de perfil ficam guardados. O caso de uso só
// conhece o endereço público devolvido por store().
export interface UserPhotoFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export abstract class UserPhotoStorage {
  // Valida e grava a imagem; devolve o endereço público da foto.
  abstract store(file: UserPhotoFile): Promise<string>;

  // Apaga a foto se ela foi gravada por este armazenamento. Endereços
  // externos (ex.: foto da conta Google) são ignorados.
  abstract remove(photoUrl: string): Promise<void>;
}
