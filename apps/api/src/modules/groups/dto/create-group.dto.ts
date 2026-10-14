import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  COMMUNITY_GROUP_SECTIONS,
  SONG_STATUSES,
  type CommunityGroupSection,
  type SongStatus,
} from '@luotianyi/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ description: '群名 / 地区名', example: '广东广州' })
  @IsString()
  @IsNotEmpty({ message: '群名不能为空' })
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: 'QQ 群号', example: '695915987' })
  @IsString()
  @IsNotEmpty({ message: 'QQ 群号不能为空' })
  @MaxLength(20)
  number: string;

  @ApiPropertyOptional({ description: '活跃度标记：★★ / ★ / ① / ② / ③ / ④', example: '★' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  level?: string;

  @ApiPropertyOptional({ description: '备注（同人展可填举办日期）' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({
    description: '所属栏目',
    enum: [...COMMUNITY_GROUP_SECTIONS],
    default: 'other',
  })
  @IsOptional()
  @IsIn([...COMMUNITY_GROUP_SECTIONS], { message: 'section 取值不合法' })
  section?: CommunityGroupSection;

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

export class UpdateGroupDto extends PartialType(CreateGroupDto) {}

export class BulkDeleteGroupsDto {
  @ApiPropertyOptional({ description: '待删除的群聊 ID 列表' })
  @IsOptional()
  ids?: string[];
}
