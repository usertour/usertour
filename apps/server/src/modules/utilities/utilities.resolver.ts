import { Public } from '@/modules/auth/decorators/public.decorator';
import { UserEntity } from '@/modules/auth/decorators/user.decorator';
import { S3ConfigGuard } from '@/modules/common/guards/s3-config.guard';
import { resolveMcpResource, resolveOrigin } from '@/modules/common/utils/resolve-origin.util';
import { UserDTO } from '@/modules/users/dtos/user.dto';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Request } from 'express';
import { createPresignedUrlInput } from './dtos/create-presigned-url.input';
import { GlobalConfigDTO } from './dtos/global-config.dto';
import { OEmbedDTO } from './dtos/oembed.dto';
import { StorageDTO } from './dtos/storage.dto';
import { UtilitiesService } from './services/utilities.service';

@Resolver()
export class UtilitiesResolver {
  constructor(
    private utilitiesService: UtilitiesService,
    private configService: ConfigService,
  ) {}

  @UseGuards(S3ConfigGuard)
  @Mutation(() => StorageDTO)
  async createPresignedUrl(
    @UserEntity() user: UserDTO,
    @Args('data') data: createPresignedUrlInput,
  ) {
    return this.utilitiesService.createPresignedUrl(user.id, data);
  }

  @Query(() => OEmbedDTO)
  async queryOembedInfo(@UserEntity() _: UserDTO, @Args('url') url: string) {
    return this.utilitiesService.queryOembedInfo(url);
  }

  @Public()
  @Query(() => GlobalConfigDTO)
  async globalConfig(@Context() context: { req?: Request }) {
    // URLs resolve at the transport boundary (services take data, not the
    // Express request — house rule): configured value first, else derived
    // from the request. `req` is absent over the legacy websocket transport
    // (installSubscriptionHandlers) — the helpers tolerate that and yield ''.
    return this.utilitiesService.globalConfig({
      apiUrl: resolveOrigin(this.configService, context.req),
      mcpServerUrl: resolveMcpResource(this.configService, context.req),
    });
  }
}
