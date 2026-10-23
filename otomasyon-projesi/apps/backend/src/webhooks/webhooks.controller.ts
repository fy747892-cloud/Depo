import { Body, Controller, Post } from '@nestjs/common';
import { CvAnalysisResultDto } from './dto/cv-analysis-result.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('cv-analiz-sonucu')
  saveCvAnalysis(@Body() dto: CvAnalysisResultDto) {
    return this.webhooksService.saveCvAnalysis(dto);
  }

  @Post('aday-eslestirme')
  candidateMatching(@Body() payload: Record<string, unknown>) {
    return this.webhooksService.sendCandidateMatching(payload);
  }

  @Post('mulakat-bildirimi')
  interviewNotification(@Body() payload: Record<string, unknown>) {
    return this.webhooksService.sendInterviewNotification(payload);
  }
}

