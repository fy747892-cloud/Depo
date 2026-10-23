import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateInterviewDto, UpdateInterviewNotesDto } from './dto/interview.dto';
import { InterviewsService } from './interviews.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.YONETICI)
@Controller('mulakatlar')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  create(@Body() dto: CreateInterviewDto, @CurrentUser() user: { id: string }) {
    return this.interviewsService.create(dto, user.id);
  }

  @Patch(':id/notlar')
  addNotes(@Param('id') id: string, @Body() dto: UpdateInterviewNotesDto) {
    return this.interviewsService.addNotes(id, dto.notes);
  }
}
