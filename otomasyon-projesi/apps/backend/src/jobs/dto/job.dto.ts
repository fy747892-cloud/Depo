import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { JobStatus, WorkMode } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  positionName!: string;

  @IsString()
  department!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  requiredSkills!: string[];

  @IsString()
  @IsOptional()
  educationRequirement?: string;

  @IsString()
  @IsOptional()
  experienceRequirement?: string;

  @IsEnum(WorkMode)
  workMode!: WorkMode;

  @IsDateString()
  deadline!: string;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}
