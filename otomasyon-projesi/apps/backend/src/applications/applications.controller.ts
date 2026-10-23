import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApplicationStatus, RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';
import { ApplicationsService } from './applications.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('basvurular')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Roles(RoleName.ADAY)
  @Post()
  apply(@CurrentUser() user: { id: string }, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.apply(user.id, dto.jobId);
  }

  @Roles(RoleName.ADAY, RoleName.YONETICI)
  @Get()
  list(@CurrentUser() user: { id: string; role: RoleName }, @Query() query: { status?: ApplicationStatus; view?: 'hr' | 'candidate' }) {
    if (query.view !== 'hr' && user.role === RoleName.ADAY) {
      return this.applicationsService.listForCandidate(user.id);
    }

    return this.applicationsService.listForHr(query);
  }

  @Roles(RoleName.YONETICI)
  @Patch(':id/durum')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.applicationsService.updateStatus(id, dto.status);
  }
}
