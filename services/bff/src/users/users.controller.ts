import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.usersService.register(dto);
  }

  @Post('auth/login')
  login(@Body() body: unknown) {
    return this.usersService.login(body);
  }

  @Get('me')
  me() {
    return this.usersService.me();
  }
}
