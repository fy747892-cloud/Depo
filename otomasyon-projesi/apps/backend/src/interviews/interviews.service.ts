import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { CreateInterviewDto } from './dto/interview.dto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService
  ) {}

  async create(dto: CreateInterviewDto, createdById: string) {
    const interview = await this.prisma.interview.create({
      data: { ...dto, scheduledAt: new Date(dto.scheduledAt), createdById },
      include: { application: { include: { candidate: { include: { user: true } }, job: true } } }
    });
    await this.webhooks.sendInterviewNotification({
      interviewId: interview.id,
      candidateEmail: interview.application.candidate.user.email,
      positionName: interview.application.job.positionName,
      scheduledAt: interview.scheduledAt
    });
    return interview;
  }

  addNotes(id: string, notes: string) {
    return this.prisma.interview.update({ where: { id }, data: { notes, status: 'TAMAMLANDI' } });
  }
}

