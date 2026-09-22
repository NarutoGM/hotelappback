import { Controller, Post, Body, Get, Patch, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service.js';
import type { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto.js';

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

  @Patch('profile/:id')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(id, dto);
  }

  @Post('profile/:id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Debe proporcionar un archivo de imagen en el campo "file".');
    }
    return this.authService.uploadAvatar(
      id,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }
}
