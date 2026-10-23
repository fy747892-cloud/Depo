import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  list(query: { page?: number; role?: RoleName; search?: string }) {
    const page = Number(query.page ?? 1);
    return this.prisma.user.findMany({
      where: {
        role: query.role ? { name: query.role } : undefined,
        OR: query.search
          ? [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } }
            ]
          : undefined
      },
      include: { role: true, candidate: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const role = dto.role ? await this.prisma.role.upsert({ where: { name: dto.role }, update: {}, create: { name: dto.role } }) : undefined;
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 12))
      : undefined;

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash,
        isActive: dto.isActive,
        roleId: role?.id
      },
      include: { role: true }
    });
  }

  me(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        role: { select: { name: true } },
        candidate: true
      }
    });
  }

  async updateMe(id: string, dto: UpdateUserDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Bu e-posta adresi başka bir hesapta kullanılıyor.');
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 12))
      : undefined;

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: { select: { name: true } }
      }
    });
  }
}
