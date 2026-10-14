import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: '角色名', example: '内容编辑' })
  @IsString()
  @IsNotEmpty({ message: '角色名不能为空' })
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: '角色说明' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '权限键列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
