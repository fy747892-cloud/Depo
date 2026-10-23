import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ScoringService } from './scoring.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly ai: AiService,
    private readonly webhooks: WebhooksService
  ) {}

  async apply(userId: string, jobId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: { skills: { include: { skill: true } }, certificates: true, projects: true }
    });
    if (!candidate) throw new NotFoundException('Stajyer profili bulunamadı.');

    const job = await this.prisma.job.findUnique({ where: { id: jobId }, include: { requiredSkills: true } });
    if (!job) throw new NotFoundException('Staj yeri bulunamadı.');

    const existing = await this.prisma.application.findUnique({ where: { candidateId_jobId: { candidateId: candidate.id, jobId } } });
    if (existing) throw new ConflictException('Bu staj yerine daha önce başvurdunuz.');

    const candidateSkills = new Set(candidate.skills.map((item) => item.skill.name.toLowerCase()));
    const matched = job.requiredSkills.filter((skill) => candidateSkills.has(skill.name.toLowerCase()));
    const score = this.scoring.calculate({
      educationMatched: Boolean(candidate.education),
      skillMatchRatio: job.requiredSkills.length ? matched.length / job.requiredSkills.length : 1,
      certificateCount: candidate.certificates.length,
      projectCount: candidate.projects.length,
      experienceMatched: Boolean(candidate.experiences)
    });
    const matchingResult = await this.ai.buildMatchingSummary({
      totalScore: score.totalScore,
      strengths: matched.map((skill) => skill.name),
      missingSkills: job.requiredSkills.filter((skill) => !candidateSkills.has(skill.name.toLowerCase())).map((skill) => skill.name)
    });

    const application = await this.prisma.application.create({
      data: { candidateId: candidate.id, jobId, ...score, matchingResult },
      include: { job: true, candidate: { include: { user: true } } }
    });

    await this.webhooks.sendCandidateMatching({
      applicationId: application.id,
      candidateId: candidate.id,
      candidateEmail: application.candidate.user.email,
      jobId: job.id,
      positionName: job.positionName,
      department: job.department,
      totalScore: score.totalScore,
      matchingResult
    });

    return application;
  }

  listForHr(query: { status?: ApplicationStatus }) {
    return this.prisma.application.findMany({
      where: { status: query.status },
      include: { candidate: { include: { user: true, skills: { include: { skill: true } } } }, job: true, interviews: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  listForCandidate(userId: string) {
    return this.prisma.application.findMany({
      where: { candidate: { userId } },
      include: { job: true, interviews: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  updateStatus(id: string, status: ApplicationStatus) {
    return this.prisma.application.update({ where: { id }, data: { status } });
  }
}
