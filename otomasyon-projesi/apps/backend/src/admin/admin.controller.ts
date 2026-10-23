import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.YONETICI)
@Controller('yonetici')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analitik')
  analytics() {
    return this.adminService.analytics();
  }

  @Get('raporlar')
  reports() {
    return this.adminService.reports();
  }
}
