import { ApiPropertyOptional } from '@nestjs/swagger';
import { SONG_SORT_FIELDS, SONG_STATUSES, VOCAL_TYPES, type SongSortField, type SongStatus, type SortOrder, type VocalType } from '@luotianyi/shared';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseBooleanQuery } from '../../../common/utils';

export class QuerySongsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '模糊关键词（PostgreSQL 兜底检索使用）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: '发行年份' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ description: '标签' })
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

  @ApiPropertyOptional({ description: '状态（仅后台有效）', enum: [...SONG_STATUSES] })
  @IsOptional()
  @IsIn([...SONG_STATUSES])
  status?: SongStatus;

  @ApiPropertyOptional({ description: '排序字段', enum: [...SONG_SORT_FIELDS], default: 'createdAt' })
  @IsOptional()
  @IsIn([...SONG_SORT_FIELDS])
  sortBy?: SongSortField;

  @ApiPropertyOptional({ description: '排序方向', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: SortOrder;
}

export class BulkDeleteDto {
  @ApiPropertyOptional({ description: '待删除的歌曲 ID 列表' })
  @IsOptional()
  ids?: string[];
}
