import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async analytics() {
    const [users, candidates, jobs, applications, interviews] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.candidate.count(),
      this.prisma.job.count(),
      this.prisma.application.count(),
      this.prisma.interview.count()
    ]);
    return { users, candidates, jobs, applications, interviews };
  }

  reports() {
    return this.prisma.application.groupBy({ by: ['status'], _count: { status: true } });
  }
}

