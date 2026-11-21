import type { GetUserByIdOutput } from '../../../application/use-cases/get-user-by-id/get-user-by-id.output.js';

export type GetUserByIdResponse = GetUserByIdOutput;

export class GetUserByIdPresenter {
  static toHttp(output: GetUserByIdOutput): GetUserByIdResponse {
    return { ...output };
  }
}
