import { UserEntity } from '@/common/decorators/user.decorator';
import { S3ConfigGuard } from '@/common/guards';
import { User } from '@/users/models/user.model';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { createPresignedUrlInput } from './dto/createPresignedUrl.input';
import { GlobalConfig } from './models/global.model';
import { OEmbed } from './models/oembed.model';
import { Storage } from './models/storage.model';
import { UtilitiesService } from './utilities.service';

@Resolver()
export class UtilitiesResolver {
  constructor(private utilitiesService: UtilitiesService) {}

  @UseGuards(S3ConfigGuard)
  @Mutation(() => Storage)
  async createPresignedUrl(@UserEntity() user: User, @Args('data') data: createPresignedUrlInput) {
    return this.utilitiesService.createPresignedUrl(user.id, data);
  }

  @Query(() => OEmbed)
  async queryOembedInfo(@UserEntity() _: User, @Args('url') url: string) {
    return this.utilitiesService.queryOembedInfo(url);
  }

  @Query(() => GlobalConfig)
  async globalConfig(@UserEntity() user: User) {
    return this.utilitiesService.globalConfig(user);
  }
}
