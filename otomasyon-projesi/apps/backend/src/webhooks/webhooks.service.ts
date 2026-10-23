import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CvAnalysisResultDto } from './dto/cv-analysis-result.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async sendCvAnalysis(payload: { candidateId: string; cvUrl: string }) {
    return this.postToN8n('N8N_CV_ANALYSIS_WEBHOOK_URL', payload);
  }

  async sendCandidateMatching(payload: Record<string, unknown>) {
    return this.postToN8n('N8N_CANDIDATE_MATCHING_WEBHOOK_URL', payload);
  }

  async sendInterviewNotification(payload: Record<string, unknown>) {
    return this.postToN8n('N8N_INTERVIEW_NOTIFICATION_WEBHOOK_URL', payload);
  }

  async saveCvAnalysis(dto: CvAnalysisResultDto) {
    const skills = await Promise.all(
      dto.skills.map((name) => this.prisma.skill.upsert({ where: { name }, update: {}, create: { name } }))
    );

    return this.prisma.candidate.update({
      where: { id: dto.candidateId },
      data: {
        education: dto.education as Prisma.InputJsonValue | undefined,
        experiences: dto.experience as Prisma.InputJsonValue | undefined,
        suitability: dto.suitability,
        aiAnalysis: dto as unknown as Prisma.InputJsonValue,
        skills: { createMany: { data: skills.map((skill) => ({ skillId: skill.id })), skipDuplicates: true } },
        certificates: { create: dto.certificates.map((name) => ({ name })) },
        projects: { create: dto.projects.map((project) => ({ name: String(project.name ?? 'Proje'), description: String(project.description ?? ''), technologies: [] })) }
      },
      include: { skills: { include: { skill: true } }, certificates: true, projects: true }
    });
  }

  private async postToN8n(key: string, payload: Record<string, unknown>) {
    const url = this.config.get<string>(key);
    if (!url) return { queued: false, message: `${key} tanımlı değil.` };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { queued: response.ok, status: response.status };
  }
}
