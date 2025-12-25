import { S3ConfigNotSetError } from '@/common/errors';
import { CanActivate, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3ConfigGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(): boolean {
    // Validate AWS S3 configuration (endpoint is optional)
    const s3Region = this.configService.get<string>('aws.s3.region');
    const s3AccessKeyId = this.configService.get<string>('aws.s3.accessKeyId');
    const s3SecretAccessKey = this.configService.get<string>('aws.s3.secretAccessKey');
    const s3Bucket = this.configService.get<string>('aws.s3.bucket');

    if (!s3Region || !s3AccessKeyId || !s3SecretAccessKey || !s3Bucket) {
      throw new S3ConfigNotSetError();
    }

    return true;
  }
}
