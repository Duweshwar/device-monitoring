import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AuthService, RegisterDto, LoginDto } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('pairing-code')
  async getPairingCode(@Query('userId') userId: string) {
    return this.authService.getOrGeneratePairingCode(userId);
  }
}
