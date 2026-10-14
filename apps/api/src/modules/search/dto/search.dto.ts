import { ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_CATEGORIES, VOCAL_TYPES, type LinkCategory, type SortOrder, type VocalType } from '@luotianyi/shared';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseBooleanQuery } from '../../../common/utils';

export const SEARCH_SORT_FIELDS = ['relevance', 'playCount', 'releaseYear', 'createdAt', 'title'] as const;
export type SearchSortField = (typeof SEARCH_SORT_FIELDS)[number];

export class SearchSongsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词，例如「权御天下」或「licheng」' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: '限定发行年份' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ description: '限定标签' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;

  @ApiPropertyOptional({ description: '演唱形式', enum: [...VOCAL_TYPES] })
  @IsOptional()
  @IsIn([...VOCAL_TYPES])
  vocalType?: VocalType;

  @ApiPropertyOptional({ description: 'P 主' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  producer?: string;

  @ApiPropertyOptional({ description: '只看代表作' })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: '排序方式', enum: [...SEARCH_SORT_FIELDS], default: 'relevance' })
  @IsOptional()
  @IsIn([...SEARCH_SORT_FIELDS])
  sortBy?: SearchSortField;

  @ApiPropertyOptional({ description: '排序方向', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: SortOrder;
}

export class SearchLinksDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ description: '分类', enum: [...LINK_CATEGORIES] })
  @IsOptional()
  @IsIn([...LINK_CATEGORIES])
  category?: LinkCategory;

  @ApiPropertyOptional({ description: '只看推荐站点' })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  recommended?: boolean;
}
