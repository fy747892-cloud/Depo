export type UserRole = 'ADAY' | 'YONETICI';

export type MatchingResult = {
  suitabilityPercentage: number;
  strengths: string[];
  missingSkills: string[];
  recommendationSummary: string;
};

export type ApplicationScore = {
  scoreEducation: number;
  scoreSkills: number;
  scoreCertificates: number;
  scoreProjects: number;
  scoreExperience: number;
  totalScore: number;
};
