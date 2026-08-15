import { Public } from '@/common/decorators/public.decorator';
import { UserEntity } from '@/common/decorators/user.decorator';
import { S3ConfigGuard } from '@/common/guards';
import { resolveMcpResource, resolveOrigin } from '@/common/http/resolve-origin';
import { User } from '@/users/models/user.model';
import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Request } from 'express';
import { createPresignedUrlInput } from './dto/createPresignedUrl.input';
import { GlobalConfig } from './models/global.model';
import { OEmbed } from './models/oembed.model';
import { Storage } from './models/storage.model';
import { UtilitiesService } from './utilities.service';

@Resolver()
export class UtilitiesResolver {
  constructor(
    private utilitiesService: UtilitiesService,
    private configService: ConfigService,
  ) {}

  @UseGuards(S3ConfigGuard)
  @Mutation(() => Storage)
  async createPresignedUrl(@UserEntity() user: User, @Args('data') data: createPresignedUrlInput) {
    return this.utilitiesService.createPresignedUrl(user.id, data);
  }

  @Query(() => OEmbed)
  async queryOembedInfo(@UserEntity() _: User, @Args('url') url: string) {
    return this.utilitiesService.queryOembedInfo(url);
  }

  @Public()
  @Query(() => GlobalConfig)
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
