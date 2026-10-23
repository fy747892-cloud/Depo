import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateInterviewDto {
  @IsString()
  applicationId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  meetingUrl?: string;
}

export class UpdateInterviewNotesDto {
  @IsString()
  notes!: string;
}

