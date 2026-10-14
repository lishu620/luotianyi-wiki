import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuerySongsDto } from './dto/query-songs.dto';
import { SongsService } from './songs.service';

@ApiTags('歌曲（公开）')
@Controller('songs')
export class SongsController {
  constructor(private readonly songs: SongsService) {}

  @Get()
  @ApiOperation({ summary: '分页查询已发布歌曲（含筛选与排序）' })
  findAll(@Query() query: QuerySongsDto) {
    return this.songs.findPublished(query);
  }

  @Get('featured')
  @ApiOperation({ summary: '获取代表作 / 名曲' })
  async findFeatured(@Query('limit') limit?: string) {
    const take = Math.min(Math.max(Number(limit ?? 6) || 6, 1), 24);
    return this.songs.findFeatured(take);
  }

  @Get('filters')
  @ApiOperation({ summary: '获取筛选项（年份 / P 主 / 标签）' })
  getFilters() {
    return this.songs.getFilterOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: '歌曲详情' })
  findOne(@Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) id: string) {
    return this.songs.findOnePublished(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: '相关推荐歌曲' })
  async findRelated(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) id: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(Number(limit ?? 4) || 4, 1), 12);
    return this.songs.findRelated(id, take);
  }
}
