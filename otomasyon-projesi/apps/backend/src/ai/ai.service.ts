import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly client?: OpenAI;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    this.client = apiKey ? new OpenAI({ apiKey }) : undefined;
  }

  async buildMatchingSummary(input: { totalScore: number; strengths: string[]; missingSkills: string[] }) {
    const fallback = {
      suitabilityPercentage: input.totalScore,
      strengths: input.strengths,
      missingSkills: input.missingSkills,
      recommendationSummary: `Bu stajyerin iş yeri uygunluk oranı %${input.totalScore}'dir. Eksik beceriler: ${input.missingSkills.join(', ') || 'Yok'}. Güçlü beceriler: ${input.strengths.join(', ') || 'Belirtilmemiş'}.`
    };

    if (!this.client) return fallback;

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Türkçe, kısa ve profesyonel stajyer-iş yeri uygunluk değerlendirmesi yaz.' },
        { role: 'user', content: JSON.stringify(fallback) }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0]?.message.content ?? JSON.stringify(fallback));
  }
}
