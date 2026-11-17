import type { LoginOutput } from '../../../application/use-cases/login/login.output.js';

export interface LoginResponse {
  userId: string;
  name: string;
  email: string;
  status: LoginOutput['status'];
}

export class LoginPresenter {
  static toHttp(output: LoginOutput): LoginResponse {
    return {
      userId: output.userId,
      name: output.name,
      email: output.email,
      status: output.status,
    };
  }
}
