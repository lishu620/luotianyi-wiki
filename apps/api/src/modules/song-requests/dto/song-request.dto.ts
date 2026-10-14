import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CHANGE_REQUEST_STATUSES, type ChangeRequestStatus } from '@luotianyi/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseBooleanQuery } from '../../../common/utils';

export class CreateSongRequestDto {
  @ApiProperty({ description: '拟修改的歌曲字段（仅提交需要改动的项）' })
  @IsObject()
  @IsNotEmpty({ message: '修改内容不能为空' })
  changes: Record<string, unknown>;

  @ApiPropertyOptional({ description: '申请说明 / 理由' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ReviewSongRequestDto {
  @ApiPropertyOptional({ description: '审批备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class QuerySongRequestsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '状态', enum: [...CHANGE_REQUEST_STATUSES] })
  @IsOptional()
  @IsIn([...CHANGE_REQUEST_STATUSES])
  status?: ChangeRequestStatus;

  @ApiPropertyOptional({ description: '按歌曲筛选' })
  @IsOptional()
  @IsUUID('4')
  songId?: string;

  @ApiPropertyOptional({ description: '仅看我提交的' })
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  mine?: boolean;
}
