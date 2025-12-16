import { EmailConfigNotSetError } from '@/common/errors';
import { CanActivate, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailConfigGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(): boolean {
    const emailEnabled = this.configService.get<boolean>('auth.email.enabled');
    if (!emailEnabled) {
      throw new EmailConfigNotSetError();
    }

    // Validate email SMTP configuration
    const emailHost = this.configService.get<string>('email.host');
    const emailPort = this.configService.get<number>('email.port');
    const emailUser = this.configService.get<string>('email.user');
    const emailPass = this.configService.get<string>('email.pass');

    if (!emailHost || !emailPort || !emailUser || !emailPass) {
      throw new EmailConfigNotSetError();
    }

    return true;
  }
}
