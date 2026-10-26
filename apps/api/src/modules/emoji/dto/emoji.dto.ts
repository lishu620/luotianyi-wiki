import {
  EMOJI_CATEGORIES,
  EMOJI_PACK_STATUSES,
  EMOJI_SORT_FIELDS,
  EMOJI_WATERMARK_POSITIONS,
  type EmojiCategory,
  type EmojiPackStatus,
  type EmojiSortField,
  type EmojiWatermarkPosition,
  type SortOrder,
} from '@luotianyi/shared';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseBooleanQuery } from '../../../common/utils';

export class QueryEmojiPacksDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按名称 / 简介 / 标签筛选' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: '分类', enum: [...EMOJI_CATEGORIES] })
  @IsOptional()
  @IsIn([...EMOJI_CATEGORIES])
  category?: EmojiCategory;

  @ApiPropertyOptional({ description: '状态（仅后台有效）', enum: [...EMOJI_PACK_STATUSES] })
  @IsOptional()
  @IsIn([...EMOJI_PACK_STATUSES])
  status?: EmojiPackStatus;

  @ApiPropertyOptional({ description: '排序字段', enum: [...EMOJI_SORT_FIELDS], default: 'updatedAt' })
  @IsOptional()
  @IsIn([...EMOJI_SORT_FIELDS])
  sortBy?: EmojiSortField;

  @ApiPropertyOptional({ description: '排序方向', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: SortOrder;
}

export class CreateEmojiPackDto {
  @ApiProperty({ description: '表情包名称' })
  @IsString()
  @Length(1, 120, { message: '名称长度需在 1-120 字之间' })
  name: string;

  @ApiPropertyOptional({ description: '简介' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: '分类', enum: [...EMOJI_CATEGORIES] })
  @IsOptional()
  @IsIn([...EMOJI_CATEGORIES])
  category?: EmojiCategory;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '状态', enum: [...EMOJI_PACK_STATUSES] })
  @IsOptional()
  @IsIn([...EMOJI_PACK_STATUSES])
  status?: EmojiPackStatus;

  @ApiPropertyOptional({ description: '是否默认建议加水印' })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  watermarkEnabled?: boolean;

  @ApiPropertyOptional({ description: '默认水印文字' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  watermarkText?: string;

  @ApiPropertyOptional({ description: '水印位置', enum: [...EMOJI_WATERMARK_POSITIONS] })
  @IsOptional()
  @IsIn([...EMOJI_WATERMARK_POSITIONS])
  watermarkPosition?: EmojiWatermarkPosition;

  @ApiPropertyOptional({ description: '水印不透明度', minimum: 0.05, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.05)
  @Max(1)
  watermarkOpacity?: number;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateEmojiPackDto extends PartialType(CreateEmojiPackDto) {}

export class UpdateEmojiImageDto {
  @ApiPropertyOptional({ description: '表情名称' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class ApplyEmojiWatermarkDto {
  @ApiProperty({ description: '水印文字（传空字符串表示移除水印）' })
  @IsString()
  @MaxLength(120)
  text: string;

  @ApiPropertyOptional({ description: '水印位置', enum: [...EMOJI_WATERMARK_POSITIONS] })
  @IsOptional()
  @IsIn([...EMOJI_WATERMARK_POSITIONS])
  position?: EmojiWatermarkPosition;

  @ApiPropertyOptional({ description: '水印不透明度', minimum: 0.05, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.05)
  @Max(1)
  opacity?: number;
}

export class BulkDeleteEmojiPacksDto {
  @ApiPropertyOptional({ description: '待删除的表情包 ID 列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}
