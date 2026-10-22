import { Controller, Get, Post } from '@nestjs/common';

@Controller('user')
export class UserController {
  @Post()
  create(): string {
    return 'ts action create a new user';
  }

  @Get()
  findAll(): string {
    return 'all users';
  }
}
