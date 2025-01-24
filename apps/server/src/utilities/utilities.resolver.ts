import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UtilitiesService } from "./utilities.service";
import { Storage } from "./models/storage.model";
import { UserEntity } from "@/common/decorators/user.decorator";
import { User } from "@/users/models/user.model";
import { createPresignedUrlInput } from "./dto/createPresignedUrl.input";
import { OEmbed } from "./models/oembed.model";

@Resolver()
export class UtilitiesResolver {
  constructor(private utilitiesService: UtilitiesService) {}

  @Mutation(() => Storage)
  async createPresignedUrl(
    @UserEntity() user: User,
    @Args("data") data: createPresignedUrlInput
  ) {
    return this.utilitiesService.createPresignedUrl(user.id, data);
  }

  @Query(() => OEmbed)
  async queryOembedInfo(@UserEntity() user: User, @Args("url") url: string) {
    return this.utilitiesService.queryOembedInfo(url);
  }
}
