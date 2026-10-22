import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './app.controller.js';

describe('UserController', () => {
  let userController: UserController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
    }).compile();

    userController = app.get<UserController>(UserController);
  });

  it('create', () => {
    expect(userController.create()).toBe('ts action create a new user');
  });

  it('findAll', () => {
    expect(userController.findAll()).toBe('all users');
  });
});
