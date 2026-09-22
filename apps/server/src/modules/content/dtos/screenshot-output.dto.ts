import { ObjectType } from '@nestjs/graphql';

@ObjectType('ScreenshotOutput')
export class ScreenshotOutputDTO {
  mini: string;
  full: string;
}
