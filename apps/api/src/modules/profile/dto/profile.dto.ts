import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PROFILE_SLUGS, type ProfileSectionData, type ProfileSlug } from '@luotianyi/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProfileSectionDto {
  @ApiProperty({ description: '分节标识', enum: [...PROFILE_SLUGS], example: 'basic' })
  @IsIn([...PROFILE_SLUGS], { message: 'slug 取值不合法' })
  slug: ProfileSlug;

  @ApiProperty({ description: '分节标题', example: '基础资料' })
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ description: '副标题' })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  subtitle?: string;

  @ApiPropertyOptional({ description: '正文（支持 Markdown 子集）' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '结构化数据，例如 facts / gallery / timeline' })
  @IsOptional()
  @IsObject()
  data?: ProfileSectionData;

  @ApiPropertyOptional({ description: 'Element Plus 图标名' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ApiPropertyOptional({ description: '排序权重', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '是否发布', default: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateProfileSectionDto extends PartialType(CreateProfileSectionDto) {}
