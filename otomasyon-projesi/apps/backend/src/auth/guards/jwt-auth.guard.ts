import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: TUser | false | null | undefined): TUser {
    if (err) throw err;
    if (!user) throw new UnauthorizedException('Oturum doğrulanamadı.');
    return user;
  }
}
