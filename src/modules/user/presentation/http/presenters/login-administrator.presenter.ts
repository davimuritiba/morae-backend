import type { LoginAdministratorOutput } from '../../../application/use-cases/login-administrator/login-administrator.output.js';

export interface LoginAdministratorResponse {
  administratorId: string;
  userId: string;
  login: string;
  permissions: LoginAdministratorOutput['permissions'];
  accessToken: string;
  tokenType: 'Bearer';
}

export class LoginAdministratorPresenter {
  static toHttp(
    output: LoginAdministratorOutput,
    accessToken: string,
  ): LoginAdministratorResponse {
    return {
      administratorId: output.administratorId,
      userId: output.userId,
      login: output.login,
      permissions: output.permissions,
      accessToken,
      tokenType: 'Bearer',
    };
  }
}
