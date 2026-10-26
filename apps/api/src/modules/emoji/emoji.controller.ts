import type { AdminUser, EmojiImageSearchResult, EmojiPack, Paginated } from '@luotianyi/shared';
import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { QueryEmojiPacksDto } from './dto/emoji.dto';
import { readEmojiUpload } from './emoji-multipart.util';
import { EmojiService } from './emoji.service';

@ApiTags('表情广场（公开）')
@Controller('emoji')
export class EmojiController {
  constructor(private readonly emoji: EmojiService) {}

  @Get('packs')
  @ApiOperation({ summary: '分页浏览公开表情包' })
  findPacks(@Query() query: QueryEmojiPacksDto): Promise<Paginated<EmojiPack>> {
    return this.emoji.findPublicPacks(query);
  }

  @Get('categories')
  @ApiOperation({ summary: '各分类表情包数量' })
  categories() {
    return this.emoji.getCategoryCounts();
  }

  @Get('stats')
  @ApiOperation({ summary: '表情包与表情总数' })
  stats() {
    return this.emoji.getStats();
  }

  @Post('search/image')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: '待搜索的图片' },
      },
    },
  })
  @ApiOperation({ summary: '以图搜图：上传图片查找相似表情与所属表情包' })
  async searchByImage(
    @Req() req: FastifyRequest,
    @Query('limit') limit?: string,
    @Query('maxDistance') maxDistance?: string,
  ): Promise<EmojiImageSearchResult> {
    const upload = await readEmojiUpload(req);

    return this.emoji.searchByImage(upload.buffer, {
      limit: limit ? Number(limit) : undefined,
      maxDistance: maxDistance ? Number(maxDistance) : undefined,
    });
  }

  @Get('packs/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '表情包详情（含全部表情）' })
  findPack(
    @CurrentUser() user: AdminUser | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EmojiPack> {
    return this.emoji.findPublicPack(id, user?.id);
  }
}
