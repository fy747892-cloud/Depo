import { IsArray, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CvAnalysisResultDto {
  @IsString()
  candidateId!: string;

  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @IsObject()
  @IsOptional()
  education?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  experience?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  certificates!: string[];

  @IsArray()
  projects!: Record<string, unknown>[];

  @IsInt()
  @Min(0)
  @Max(100)
  suitability!: number;
}

