import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  list(query: { page?: number; search?: string; department?: string }) {
    const page = Number(query.page ?? 1);
    const take = 12;
    return this.prisma.job.findMany({
      where: {
        status: JobStatus.AKTIF,
        department: query.department,
        OR: query.search
          ? [
              { positionName: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } }
            ]
          : undefined
      },
      include: { requiredSkills: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take
    });
  }

  async create(dto: CreateJobDto, userId: string) {
    const skills = await Promise.all(
      dto.requiredSkills.map((name) =>
        this.prisma.skill.upsert({ where: { name }, update: {}, create: { name } })
      )
    );
    const job = await this.prisma.job.create({
      data: {
        positionName: dto.positionName,
        department: dto.department,
        description: dto.description,
        educationRequirement: dto.educationRequirement,
        experienceRequirement: dto.experienceRequirement,
        workMode: dto.workMode,
        deadline: new Date(dto.deadline),
        createdById: userId,
        requiredSkills: { connect: skills.map((skill) => ({ id: skill.id })) }
      },
      include: { requiredSkills: true }
    });

    await this.sendJobCreatedWebhook(job);
    return job;
  }

  async update(id: string, dto: Partial<UpdateJobDto>) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Staj yeri bulunamadı.');
    const skills = dto.requiredSkills
      ? await Promise.all(dto.requiredSkills.map((name) => this.prisma.skill.upsert({ where: { name }, update: {}, create: { name } })))
      : undefined;
    return this.prisma.job.update({
      where: { id },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        requiredSkills: skills ? { set: skills.map((skill) => ({ id: skill.id })) } : undefined
      },
      include: { requiredSkills: true }
    });
  }

  remove(id: string) {
    return this.prisma.job.update({ where: { id }, data: { status: JobStatus.KAPALI } });
  }

  private async sendJobCreatedWebhook(job: {
    id: string;
    positionName: string;
    department: string;
    description: string;
    educationRequirement: string | null;
    experienceRequirement: string | null;
    workMode: string;
    deadline: Date;
    status: string;
    createdById: string;
    createdAt: Date;
    requiredSkills: { name: string }[];
  }) {
    const webhookUrl = this.configService.get<string>('N8N_JOB_CREATED_WEBHOOK_URL');
    if (!webhookUrl) return;

    try {
      const recipientUsers = await this.prisma.user.findMany({
        where: { isActive: true, role: { name: RoleName.ADAY } },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
      const recipients = recipientUsers.map((user) => user.email).filter(Boolean);

      if (recipients.length === 0) {
        this.logger.warn('n8n job webhook skipped because no active candidate recipients were found.');
        return;
      }

      const jobPayload = {
        id: job.id,
        positionName: job.positionName,
        department: job.department,
        description: job.description,
        educationRequirement: job.educationRequirement,
        experienceRequirement: job.experienceRequirement,
        workMode: job.workMode,
        deadline: job.deadline,
        status: job.status,
        requiredSkills: job.requiredSkills.map((skill) => skill.name),
        createdById: job.createdById,
        createdAt: job.createdAt
      };

      const responses = await Promise.all(
        recipientUsers.map((recipientUser) =>
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'job.created',
              to: recipientUser.email,
              email: recipientUser.email,
              recipient: recipientUser.email,
              recipientEmail: recipientUser.email,
              recipients,
              recipientEmails: recipients,
              candidate: {
                id: recipientUser.id,
                email: recipientUser.email,
                firstName: recipientUser.firstName,
                lastName: recipientUser.lastName
              },
              job: jobPayload
            })
          })
        )
      );

      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        this.logger.warn(`n8n job webhook failed with status ${failedResponse.status}`);
      }
    } catch (error) {
      this.logger.warn(`n8n job webhook could not be sent: ${(error as Error).message}`);
    }
  }
}
