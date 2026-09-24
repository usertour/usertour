import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

import type { PresignedUploadRequest } from '../types/presigned-upload-request.type';

@InputType()
export class createPresignedUrlInput implements PresignedUploadRequest {
  @Field()
  @IsNotEmpty()
  fileName: string;

  @Field({ nullable: true })
  contentType?: string;

  @Field()
  @IsNotEmpty()
  storageType: string;
}
