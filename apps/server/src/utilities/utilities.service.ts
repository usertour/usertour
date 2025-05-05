import { oEmbedProviders } from '@/common/ombed/ombed';
import { isMatchUrlPattern } from '@/common/ombed/url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 } from 'uuid';
import { createPresignedUrlInput } from './dto/createPresignedUrl.input';
import { User } from '@/users/models/user.model';

@Injectable()
export class UtilitiesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async createPresignedUrl(_: string, data: createPresignedUrlInput) {
    const { fileName, contentType } = data;
    const uuid = v4();
    const key = `${uuid}/${fileName}`;
    const region = this.configService.get('AWS_S3_REGION');
    // const endpoint = this.configService.get("AWS_S3_ENDPOINT");
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

    // if (endpoint) {
    //   s3Config.endpoint = endpoint;
    // }

    const s3 = new S3Client(s3Config);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
    });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return { signedUrl, cdnUrl: `https://${domain}/${bucket}/${key}` };
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
      console.log('resp data:', resp.data);
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

  async globalConfig(user: User) {
    const enabledBillingUsers = this.configService.get('globalConfig.enabledBillingUsers');
    console.log('enabledBillingUsers:', enabledBillingUsers);
    return {
      enabledBilling: enabledBillingUsers.includes(user.id),
    };
  }
}
