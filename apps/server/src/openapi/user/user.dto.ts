import { ApiProperty } from '@nestjs/swagger';
import { User } from '../models/user.model';

export class GetUserResponseDto {
  @ApiProperty()
  data: User;
}

export class ListUsersResponseDto {
  @ApiProperty({ type: [User] })
  results: User[];

  @ApiProperty({ example: 'https://api.usertour.com/v1/users/?cursor=cD00ODY%3D', nullable: true })
  next: string | null;

  @ApiProperty({
    example: 'https://api.usertour.com/v1/users/?cursor=cj0xJnA9NDg3',
    nullable: true,
  })
  previous: string | null;
}
