import { ApiPropertyOptional } from '@nestjs/swagger';
import { LINK_CATEGORIES, SONG_STATUSES, type LinkCategory, type SongStatus } from '@luotianyi/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseBooleanQuery } from '../../../common/utils';

export class QueryLinksDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '模糊关键词' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: '分类', enum: [...LINK_CATEGORIES] })
  @IsOptional()
  @IsIn([...LINK_CATEGORIES])
  category?: LinkCategory;

  @ApiPropertyOptional({ description: '只看推荐站点' })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  recommended?: boolean;

  @ApiPropertyOptional({ description: '状态（仅后台有效）', enum: [...SONG_STATUSES] })
  @IsOptional()
  @IsIn([...SONG_STATUSES])
  status?: SongStatus;
}
