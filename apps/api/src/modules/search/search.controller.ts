import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../acl/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchLinksDto, SearchSongsDto } from './dto/search.dto';
import { MeilisearchService } from './meilisearch.service';
import { LINKS_INDEX, SONGS_INDEX, SearchIndexerService } from './search-indexer.service';
import { SearchService } from './search.service';

@ApiTags('搜索')
@Controller('search')
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly meili: MeilisearchService,
    private readonly indexer: SearchIndexerService,
  ) {}

  @Get('songs')
  @ApiOperation({ summary: '检索歌曲（Meilisearch 优先，失败自动降级）' })
  searchSongs(@Query() dto: SearchSongsDto) {
    return this.search.searchSongs(dto);
  }

  @Get('links')
  @ApiOperation({ summary: '检索同好外链站点' })
  searchLinks(@Query() dto: SearchLinksDto) {
    return this.search.searchLinks(dto);
  }

  @Get()
  @ApiOperation({ summary: '聚合搜索：同时返回歌曲与外链结果' })
  searchAll(@Query('q') q = '', @Query('limit') limit?: string) {
    const take = Math.min(Math.max(Number(limit ?? 5) || 5, 1), 20);
    return this.search.searchAll(q, take);
  }

  @Get('status')
  @ApiOperation({ summary: '搜索引擎状态与索引文档数' })
  async status() {
    const [songs, links] = await Promise.all([
      this.meili.stats(SONGS_INDEX),
      this.meili.stats(LINKS_INDEX),
    ]);

    return {
      meilisearchReady: this.meili.isReady,
      engine: this.search.engine,
      songsIndexed: songs?.numberOfDocuments ?? 0,
      linksIndexed: links?.numberOfDocuments ?? 0,
    };
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.systemReindex)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '重建全量搜索索引（后台）' })
  reindex() {
    return this.indexer.reindexAll();
  }
}
