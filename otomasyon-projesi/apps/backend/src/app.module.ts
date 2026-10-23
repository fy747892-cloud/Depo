import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { CandidatesModule } from './candidates/candidates.module';
import { InterviewsModule } from './interviews/interviews.module';
import { JobsModule } from './jobs/jobs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [join(process.cwd(), '../../.env'), '.env'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CandidatesModule,
    JobsModule,
    ApplicationsModule,
    InterviewsModule,
    NotificationsModule,
    AdminModule,
    AiModule,
    WebhooksModule
  ]
})
export class AppModule {}
