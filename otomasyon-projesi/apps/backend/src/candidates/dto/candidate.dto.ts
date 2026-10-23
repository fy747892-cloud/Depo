import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateCandidateProfileDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsObject()
  @IsOptional()
  education?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  experiences?: Record<string, unknown>;

  @IsArray()
  @IsOptional()
  languages?: Record<string, unknown>[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}
