import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCandidateProfileDto } from './dto/candidate.dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.candidate.findUnique({
      where: { userId },
      include: { user: true, skills: { include: { skill: true } }, certificates: true, projects: true, applications: { include: { job: true } } }
    });
  }

  update(userId: string, dto: UpdateCandidateProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.phone !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { phone: dto.phone } });
      }

      const skills = dto.skills
        ? await Promise.all(
            [...new Set(dto.skills.map((skill) => skill.trim()).filter(Boolean))].map((name) =>
              tx.skill.upsert({ where: { name }, update: {}, create: { name } })
            )
          )
        : undefined;

      const candidate = await tx.candidate.update({
        where: { userId },
        data: {
          title: dto.title,
          summary: dto.summary,
          education: dto.education as Prisma.InputJsonValue | undefined,
          experiences: dto.experiences as Prisma.InputJsonValue | undefined,
          languages: dto.languages as Prisma.InputJsonValue | undefined
        }
      });

      if (skills) {
        await tx.candidateSkill.deleteMany({ where: { candidateId: candidate.id } });
        if (skills.length > 0) {
          await tx.candidateSkill.createMany({
            data: skills.map((skill) => ({
              candidateId: candidate.id,
              skillId: skill.id
            }))
          });
        }
      }

      return tx.candidate.findUnique({
        where: { userId },
        include: { user: true, skills: { include: { skill: true } } }
      });
    });
  }
}
