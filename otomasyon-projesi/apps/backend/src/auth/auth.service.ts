import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const roleName = dto.role ?? RoleName.ADAY;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');

    const role = await this.prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName }
    });

    const passwordHash = await bcrypt.hash(dto.password, Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 12));
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        roleId: role.id,
        candidate: roleName === RoleName.ADAY ? { create: {} } : undefined
      },
      include: { role: true, candidate: true }
    });

    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-posta veya parola hatalı.');
    }
    return this.issueToken(user);
  }

  private issueToken(user: { id: string; email: string; firstName: string; lastName: string; role: { name: RoleName } }) {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role.name },
      {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret',
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '1d'
      }
    );
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name
      }
    };
  }
}
