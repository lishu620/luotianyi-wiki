import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CN_CARD_STYLES,
  CN_CONTACT_KEYS,
  CN_GENDERS,
  CN_PURPOSES,
  CN_SORTS,
  CN_STATUSES,
  type CnCardStyle,
  type CnGender,
  type CnPurpose,
  type CnSort,
  type CnStatus,
} from '@luotianyi/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CnContactDto {
  @ApiPropertyOptional({ description: 'QQ 号' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  qq?: string;

  @ApiPropertyOptional({ description: '微信号' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  wechat?: string;

  @ApiPropertyOptional({ description: 'B 站 UID / 主页' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bilibili?: string;

  @ApiPropertyOptional({ description: '微博' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  weibo?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;
}

export class UpsertCnProfileDto {
  @ApiProperty({ description: '圈名 CN', example: '孤看遍这世间' })
  @IsString()
  @IsNotEmpty({ message: '圈名不能为空' })
  @MaxLength(60)
  cn: string;

  @ApiPropertyOptional({ description: '头像地址' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'B 站 UID 或主页链接（保存时自动提取 UID）' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bilibiliUid?: string;

  @ApiPropertyOptional({ description: '个人介绍卡款式', enum: [...CN_CARD_STYLES], default: 'classic' })
  @IsOptional()
  @IsIn([...CN_CARD_STYLES])
  cardStyle?: CnCardStyle;

  @ApiPropertyOptional({ description: '性别', enum: [...CN_GENDERS], default: 'secret' })
  @IsOptional()
  @IsIn([...CN_GENDERS])
  gender?: CnGender;

  @ApiPropertyOptional({ description: '年龄' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  region?: string;

  @ApiPropertyOptional({ description: '性格标签' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  personality?: string;

  @ApiPropertyOptional({ description: '扩列宣言' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declaration?: string;

  @ApiPropertyOptional({ description: '兴趣标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ description: '想找的搭子类型', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lookingFor?: string[];

  @ApiPropertyOptional({ description: '用途：仅展示 / 想扩列', enum: [...CN_PURPOSES], default: 'display' })
  @IsOptional()
  @IsIn([...CN_PURPOSES])
  purpose?: CnPurpose;

  @ApiPropertyOptional({ description: '联系方式', type: CnContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CnContactDto)
  contacts?: CnContactDto;

  @ApiPropertyOptional({ description: '展示状态', enum: [...CN_STATUSES], default: 'visible' })
  @IsOptional()
  @IsIn([...CN_STATUSES])
  status?: CnStatus;
}

export class QueryCnDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '关键词（圈名 / 宣言 / 兴趣）' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  keyword?: string;

  @ApiPropertyOptional({ description: '兴趣标签' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  interest?: string;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  region?: string;

  @ApiPropertyOptional({ description: '性别', enum: [...CN_GENDERS] })
  @IsOptional()
  @IsIn([...CN_GENDERS])
  gender?: CnGender;

  @ApiPropertyOptional({ description: '用途筛选', enum: [...CN_PURPOSES] })
  @IsOptional()
  @IsIn([...CN_PURPOSES])
  purpose?: CnPurpose;

  @ApiPropertyOptional({ description: '排序模式', enum: [...CN_SORTS], default: 'latest' })
  @IsOptional()
  @IsIn([...CN_SORTS])
  sort?: CnSort;
}

/** 供 DTO 校验中间件读到 keys（避免未使用告警） */
export const CN_CONTACT_KEY_LIST = CN_CONTACT_KEYS;

export class CnStatusDto {
  @ApiProperty({ description: '展示状态', enum: [...CN_STATUSES] })
  @IsIn([...CN_STATUSES])
  status: CnStatus;
}
