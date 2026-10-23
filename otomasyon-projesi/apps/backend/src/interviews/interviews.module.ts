import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [WebhooksModule],
  controllers: [InterviewsController],
  providers: [InterviewsService]
})
export class InterviewsModule {}

