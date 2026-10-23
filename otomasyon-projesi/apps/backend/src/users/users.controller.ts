import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kullanicilar')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleName.YONETICI)
  @Get()
  list(@Query() query: { page?: number; role?: RoleName; search?: string }) {
    return this.usersService.list(query);
  }

  @Roles(RoleName.ADAY, RoleName.YONETICI)
  @Get('ben')
  me(@CurrentUser() user: { id: string }) {
    return this.usersService.me(user.id);
  }

  @Roles(RoleName.ADAY, RoleName.YONETICI)
  @Patch('ben')
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Roles(RoleName.YONETICI)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
