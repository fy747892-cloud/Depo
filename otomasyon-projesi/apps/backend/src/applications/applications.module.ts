import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ScoringService } from './scoring.service';

@Module({
  imports: [AiModule, WebhooksModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ScoringService],
  exports: [ApplicationsService]
})
export class ApplicationsModule {}
