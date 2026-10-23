import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';

@Module({
  imports: [WebhooksModule],
  controllers: [CandidatesController],
  providers: [CandidatesService]
})
export class CandidatesModule {}

