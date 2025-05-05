import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  InitializeProjectJobData,
  SendMagicLinkEmailJobData,
  SendResetPasswordEmailJobData,
} from './dto/auth.dto';
import {
  QUEUE_INITIALIZE_PROJECT,
  QUEUE_SEND_MAGIC_LINK_EMAIL,
  QUEUE_SEND_RESET_PASSWORD_EMAIL,
} from '@/common/consts/queen';
import { AuthService } from './auth.service';

@Processor(QUEUE_SEND_MAGIC_LINK_EMAIL)
export class SendMagicLinkEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(SendMagicLinkEmailProcessor.name);

  constructor(private authService: AuthService) {
    super();
  }

  async process(job: Job<SendMagicLinkEmailJobData>) {
    const { sessionId } = job.data;
    try {
      this.logger.log(`Sending magic link email for sessionId ${sessionId}`);
      await this.authService.sendMagicLinkEmailBySessionId(sessionId);
    } catch (error) {
      this.logger.error(error);
    }
  }
}

@Processor(QUEUE_SEND_RESET_PASSWORD_EMAIL)
export class SendResetPasswordEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(SendResetPasswordEmailProcessor.name);

  constructor(private authService: AuthService) {
    super();
  }

  async process(job: Job<SendResetPasswordEmailJobData>) {
    const { sessionId } = job.data;
    try {
      this.logger.log(`Sending reset password email for sessionId ${sessionId}`);
      await this.authService.sendResetPasswordEmailBySessionId(sessionId);
    } catch (error) {
      this.logger.error(error);
    }
  }
}

@Processor(QUEUE_INITIALIZE_PROJECT)
export class InitializeProjectProcessor extends WorkerHost {
  private readonly logger = new Logger(InitializeProjectProcessor.name);

  constructor(private authService: AuthService) {
    super();
  }

  async process(job: Job<InitializeProjectJobData>) {
    const { projectId } = job.data;
    try {
      this.logger.log(`Initializing project ${projectId}`);
      await this.authService.initializeProject(projectId);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
