import type { GetUserByIdOutput } from '../../../application/use-cases/get-user-by-id/get-user-by-id.output.js';

export type GetUserByIdResponse = GetUserByIdOutput;

export interface PublicUserResponse {
  userId: string;
  name: string;
  photoUrl: string | null;
}

export class GetUserByIdPresenter {
  static toHttp(output: GetUserByIdOutput): GetUserByIdResponse {
    return { ...output };
  }

  static toPublic(output: GetUserByIdOutput): PublicUserResponse {
    return {
      userId: output.userId,
      name: output.name,
      photoUrl: output.photoUrl,
    };
  }
}
