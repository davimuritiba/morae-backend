import { Controller, Get, Param, Req, Post } from '@nestjs/common';
import type { Request } from 'express';


@Controller('user')
export class UserController {
  @Post()
  create(): string {
    return 'ts action create a new user';
  }

  @Get()
  findAll(@Req() request: Request): string {
    return 'all users';
  }
}
