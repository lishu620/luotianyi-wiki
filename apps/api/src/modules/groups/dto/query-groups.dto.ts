import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  COMMUNITY_GROUP_SECTIONS,
  SONG_STATUSES,
  type CommunityGroupSection,
  type SongStatus,
} from '@luotianyi/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryGroupsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '模糊关键词（群名 / 群号 / 备注）' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: '栏目', enum: [...COMMUNITY_GROUP_SECTIONS] })
  @IsOptional()
  @IsIn([...COMMUNITY_GROUP_SECTIONS])
  section?: CommunityGroupSection;

  @ApiPropertyOptional({ description: '状态（仅后台有效）', enum: [...SONG_STATUSES] })
  @IsOptional()
  @IsIn([...SONG_STATUSES])
  status?: SongStatus;
}
