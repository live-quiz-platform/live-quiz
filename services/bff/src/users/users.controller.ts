import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('auth/login')
  login(@Body() body: unknown) {
    return this.usersService.login(body);
  }

  @Get('me')
  me() {
    return this.usersService.me();
  }
}
