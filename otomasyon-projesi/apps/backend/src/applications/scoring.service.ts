import { Injectable } from '@nestjs/common';

export type ScoreInput = {
  educationMatched: boolean;
  skillMatchRatio: number;
  certificateCount: number;
  projectCount: number;
  experienceMatched: boolean;
};

@Injectable()
export class ScoringService {
  calculate(input: ScoreInput) {
    const scoreEducation = input.educationMatched ? 20 : 8;
    const scoreSkills = Math.round(Math.min(input.skillMatchRatio, 1) * 30);
    const scoreCertificates = Math.min(input.certificateCount * 5, 15);
    const scoreProjects = Math.min(input.projectCount * 5, 15);
    const scoreExperience = input.experienceMatched ? 20 : 8;
    const totalScore = scoreEducation + scoreSkills + scoreCertificates + scoreProjects + scoreExperience;

    return { scoreEducation, scoreSkills, scoreCertificates, scoreProjects, scoreExperience, totalScore };
  }
}

