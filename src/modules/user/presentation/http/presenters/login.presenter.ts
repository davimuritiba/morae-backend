import type { LoginOutput } from '../../../application/use-cases/login/login.output.js';

export interface LoginResponse {
  userId: string;
  name: string;
  email: string;
  status: LoginOutput['status'];
  accessToken: string;
  tokenType: 'Bearer';
}

export class LoginPresenter {
  static toHttp(output: LoginOutput, accessToken: string): LoginResponse {
    return {
      userId: output.userId,
      name: output.name,
      email: output.email,
      status: output.status,
      accessToken,
      tokenType: 'Bearer',
    };
  }
}
