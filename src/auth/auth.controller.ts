import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('users')
  async getUsers() {
    return this.authService.getAllUsers();
  }
}
