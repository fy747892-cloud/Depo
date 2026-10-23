import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateCandidateProfileDto } from './dto/candidate.dto';
import { CandidatesService } from './candidates.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADAY)
@Controller('aday')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get('profil')
  me(@CurrentUser() user: { id: string }) {
    return this.candidatesService.me(user.id);
  }

  @Patch('profil')
  update(@CurrentUser() user: { id: string }, @Body() dto: UpdateCandidateProfileDto) {
    return this.candidatesService.update(user.id, dto);
  }
}
