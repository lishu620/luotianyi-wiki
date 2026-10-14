import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('数据统计')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  @ApiOperation({ summary: '站点总览指标' })
  getOverview() {
    return this.stats.getOverview();
  }

  @Get('by-year')
  @ApiOperation({ summary: '按年份统计歌曲数量与播放量' })
  getByYear() {
    return this.stats.getByYear();
  }

  @Get('top-songs')
  @ApiOperation({ summary: '播放量 Top 歌曲' })
  getTopSongs(@Query('limit') limit?: string) {
    return this.stats.getTopSongs(Number(limit ?? 10) || 10);
  }

  @Get('tags')
  @ApiOperation({ summary: '标签分布' })
  getTags(@Query('limit') limit?: string) {
    return this.stats.getTags(Number(limit ?? 20) || 20);
  }

  @Get()
  @ApiOperation({ summary: '统计大屏聚合数据' })
  getDashboard(@Query('topLimit') topLimit?: string, @Query('tagLimit') tagLimit?: string) {
    return this.stats.getDashboard(Number(topLimit ?? 10) || 10, Number(tagLimit ?? 20) || 20);
  }
}
