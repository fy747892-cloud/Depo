import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kayit')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('giris')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
