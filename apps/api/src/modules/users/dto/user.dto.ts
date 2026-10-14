import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseBooleanQuery } from '../../../common/utils';

export class CreateUserDto {
  @ApiProperty({ description: '登录用户名', example: 'editor01' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: '初始密码（至少 6 位）' })
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ description: '角色 ID' })
  @IsOptional()
  @IsUUID('4', { message: 'roleId 必须是合法 UUID' })
  roleId?: string | null;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class ResetPasswordDto {
  @ApiProperty({ description: '新密码（至少 6 位）' })
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(100)
  password: string;
}

export class QueryUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '用户名关键词' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;

  @ApiPropertyOptional({ description: '按角色筛选' })
  @IsOptional()
  @IsUUID('4')
  roleId?: string;

  @ApiPropertyOptional({ description: '启用状态' })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  active?: boolean;
}
