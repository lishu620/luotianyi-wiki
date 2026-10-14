import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LINK_CATEGORIES, SONG_STATUSES, type LinkCategory, type SongStatus } from '@luotianyi/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({ description: '站点名称', example: '洛天依 - 萌娘百科' })
  @IsString()
  @IsNotEmpty({ message: '站点名称不能为空' })
  @MaxLength(150)
  title: string;

  @ApiProperty({ description: '跳转地址', example: 'https://zh.moegirl.org.cn/洛天依' })
  @IsString()
  @IsNotEmpty({ message: '跳转地址不能为空' })
  @MaxLength(600)
  url: string;

  @ApiPropertyOptional({ description: '站点简介' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: '分类', enum: [...LINK_CATEGORIES], default: 'other' })
  @IsOptional()
  @IsIn([...LINK_CATEGORIES], { message: 'category 取值不合法' })
  category?: LinkCategory;

  @ApiPropertyOptional({ description: '站点图标地址' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  iconUrl?: string;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '是否官方 / 强烈推荐', default: false })
  @IsOptional()
  @IsBoolean()
  recommended?: boolean;

  @ApiPropertyOptional({ description: '排序权重，越小越靠前', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '状态', enum: [...SONG_STATUSES], default: 'published' })
  @IsOptional()
  @IsIn([...SONG_STATUSES])
  status?: SongStatus;
}

export class UpdateLinkDto extends PartialType(CreateLinkDto) {}

export class BulkDeleteLinksDto {
  @ApiPropertyOptional({ description: '待删除的站点 ID 列表' })
  @IsOptional()
  ids?: string[];
}

export class LinkClickDto {
  @ApiPropertyOptional({ description: '站点 ID', required: false })
  @IsOptional()
  @IsString()
  id?: string;
}
