import { oEmbedProviders } from '@/common/ombed/ombed';
import { isMatchUrlPattern } from '@usertour/helpers';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 } from 'uuid';
import { createPresignedUrlInput } from './dto/createPresignedUrl.input';
import { PrismaService } from 'nestjs-prisma';
import { LICENSE_FEATURE_TWO_FACTOR } from '@usertour/constants';
import { LicenseService } from '@/license/license.service';

@Injectable()
export class UtilitiesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
  ) {}

  async createPresignedUrl(_: string, data: createPresignedUrlInput) {
    const { fileName } = data;
    const uuid = v4();
    const key = `${uuid}/${fileName}`;

    const region = this.configService.get('AWS_S3_REGION');
    const endpoint = this.configService.get('AWS_S3_ENDPOINT');
    const accessKeyId = this.configService.get('AWS_S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_S3_SECRET_ACCESS_KEY');
    const domain = this.configService.get('AWS_S3_DOMAIN');
    const bucket = this.configService.get('AWS_S3_BUCKET');

    const s3Config: any = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    if (endpoint) {
      s3Config.endpoint = endpoint;
    }

    const s3 = new S3Client(s3Config);

    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    const signedUrl = getSignedUrl(s3, command, { expiresIn: 3600 });
    return { signedUrl, cdnUrl: `${domain}/${key}` };
  }

  async queryOembedInfo(url: string) {
    const endpoints = [];
    for (const provider of oEmbedProviders) {
      const e = provider.endpoints.filter((endpoint) => {
        return endpoint.schemes && isMatchUrlPattern(url, endpoint.schemes, []);
      });
      if (e && e.length > 0) {
        endpoints.push(...e);
      }
    }

    for (let index = 0; index < endpoints.length; index++) {
      const endpoint = endpoints[index];
      let requestUrl = '';
      if (endpoint.url.search('{format}') !== -1) {
        requestUrl = `${endpoint.url.replace('{format}', 'json')}?url=${encodeURIComponent(url)}`;
      } else {
        requestUrl = `${endpoint.url}?url=${encodeURIComponent(url)}&format=json`;
      }
      const resp = await this.httpService.axiosRef.get(requestUrl);
      if (resp.data) {
        return {
          html: resp.data.html,
          width: resp.data.width,
          height: resp.data.height,
        };
      }
    }
    return { html: '', width: '', height: '' };
  }

  private getAuthProviders(): string[] {
    const providers: string[] = [];

    if (this.configService.get('auth.email.enabled')) {
      providers.push('email');
    }
    if (this.configService.get('auth.google.enabled')) {
      providers.push('google');
    }
    if (this.configService.get('auth.github.enabled')) {
      providers.push('github');
    }

    return providers;
  }

  async globalConfig() {
    const isSelfHostedMode = this.configService.get('globalConfig.isSelfHostedMode');
    const apiUrl = this.configService.get('app.apiUrl');
    const mcpServerUrl = this.configService.get('app.mcpServerUrl');
    let allowUserRegistration = true;
    let allowProjectLevelSubscriptionManagement = true;
    let needsSystemAdminSetup = false;
    let require2FA = false;

    if (isSelfHostedMode) {
      const setting = await this.prisma.instanceSetting.findUnique({
        where: { key: 'instance' },
        select: {
          allowUserRegistration: true,
          allowProjectLevelSubscriptionManagement: true,
          require2FA: true,
          license: true,
        },
      });
      allowUserRegistration = setting?.allowUserRegistration ?? true;
      allowProjectLevelSubscriptionManagement =
        setting?.allowProjectLevelSubscriptionManagement ?? false;

      // Effective enforcement = admin toggle AND instance license still carries
      // the 2FA feature. Admin enforcement is an instance-level concern and so
      // only honors the instance license — project licenses don't grant the
      // ability to enforce across the whole instance. If the instance license
      // lapses, enforcement degrades to off so users aren't permanently locked
      // out of the app.
      if (setting?.require2FA && setting.license) {
        require2FA = await this.licenseService.hasFeature(
          setting.license,
          LICENSE_FEATURE_TWO_FACTOR,
        );
      }

      const user = await this.prisma.user.findFirst({
        select: { id: true },
      });
      needsSystemAdminSetup = !user;
    }

    return {
      isSelfHostedMode,
      apiUrl,
      mcpServerUrl,
      ssoCallbackUrl: this.configService.get('app.ssoCallbackUrl'),
      allowUserRegistration,
      allowProjectLevelSubscriptionManagement,
      needsSystemAdminSetup,
      require2FA,
      authProviders: this.getAuthProviders(),
    };
  }
}
