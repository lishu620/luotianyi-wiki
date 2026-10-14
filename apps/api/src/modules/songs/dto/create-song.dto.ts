import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SONG_STATUSES, VOCAL_TYPES, type SongStatus, type VocalType } from '@luotianyi/shared';
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

export class CreateSongDto {
  @ApiProperty({ description: '歌曲标题', example: '权御天下' })
  @IsString()
  @IsNotEmpty({ message: '歌曲标题不能为空' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: '标题拼音，便于拼音检索', example: 'quanyutianxia' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titlePinyin?: string;

  @ApiPropertyOptional({ description: '别名 / 其他译名', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({ description: 'P 主 / 投稿者' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  producer?: string;

  @ApiPropertyOptional({ description: '作词' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lyricist?: string;

  @ApiPropertyOptional({ description: '作曲' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  composer?: string;

  @ApiPropertyOptional({ description: '编曲' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  arranger?: string;

  @ApiPropertyOptional({ description: '演唱形式', enum: [...VOCAL_TYPES], default: 'solo' })
  @IsOptional()
  @IsIn([...VOCAL_TYPES], { message: 'vocalType 取值不合法' })
  vocalType?: VocalType;

  @ApiPropertyOptional({ description: '其他演唱者（不含洛天依）', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredSingers?: string[];

  @ApiPropertyOptional({ description: '发行日期 (YYYY-MM-DD)', example: '2015-04-25' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  releaseDate?: string;

  @ApiPropertyOptional({ description: '发行年份（未提供时自动从 releaseDate 推导）', example: 2015 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  releaseYear?: number;

  @ApiPropertyOptional({ description: '时长（秒）', example: 245 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'B 站播放量', example: 12000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  playCount?: number;

  @ApiPropertyOptional({ description: '标签', type: [String], example: ['古风', '神话'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '歌曲简介' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '歌词正文' })
  @IsOptional()
  @IsString()
  lyrics?: string;

  @ApiPropertyOptional({ description: '封面图地址' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'B 站链接' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bilibiliUrl?: string;

  @ApiPropertyOptional({ description: 'YouTube 链接' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  youtubeUrl?: string;

  @ApiPropertyOptional({ description: '网易云音乐链接' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  neteaseUrl?: string;

  @ApiPropertyOptional({ description: 'QQ 音乐链接' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  qqMusicUrl?: string;

  @ApiPropertyOptional({ description: '是否为代表作', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: '状态', enum: [...SONG_STATUSES], default: 'published' })
  @IsOptional()
  @IsIn([...SONG_STATUSES], { message: 'status 取值不合法' })
  status?: SongStatus;

  @ApiPropertyOptional({ description: '排序权重，越小越靠前', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateSongDto extends PartialType(CreateSongDto) {}
