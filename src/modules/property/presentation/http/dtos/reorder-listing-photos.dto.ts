import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderListingPhotosDto {
  // Todos os ids das fotos do anúncio, na nova ordem (a primeira vira a capa).
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  photoIds!: string[];
}
