export interface ListingPhotoFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

// Onde os arquivos das fotos dos anúncios ficam guardados.
export abstract class ListingPhotoStorage {
  // Valida e grava as imagens; devolve o endereço público de cada uma, na
  // mesma ordem.
  abstract storeFiles(files: ListingPhotoFile[]): Promise<string[]>;

  // Apaga os arquivos gravados por este armazenamento. Endereços externos
  // são ignorados.
  abstract removeFiles(urls: string[]): Promise<void>;
}
