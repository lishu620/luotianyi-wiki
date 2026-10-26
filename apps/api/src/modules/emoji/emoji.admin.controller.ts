import type { AdminUser, EmojiImage, EmojiPack, Paginated } from '@luotianyi/shared';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { PERMISSIONS } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../../common/decorators/permissions.decorator';
import { AclService } from '../acl/acl.service';
import { PermissionsGuard } from '../acl/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { EmojiImageEntity } from '../../entities/emoji-image.entity';
import type { EmojiPackEntity } from '../../entities/emoji-pack.entity';
import {
  ApplyEmojiWatermarkDto,
  BulkDeleteEmojiPacksDto,
  CreateEmojiPackDto,
  QueryEmojiPacksDto,
  UpdateEmojiImageDto,
  UpdateEmojiPackDto,
} from './dto/emoji.dto';
import { readEmojiUpload } from './emoji-multipart.util';
import { EmojiService } from './emoji.service';

const EMOJI_VIEW_PERMISSIONS = [
  PERMISSIONS.emojiCreate,
  PERMISSIONS.emojiUpdateOwn,
  PERMISSIONS.emojiUpdateAny,
  PERMISSIONS.emojiDeleteOwn,
  PERMISSIONS.emojiDeleteAny,
];

type PackAction = 'update' | 'delete';

@ApiTags('表情广场（后台）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/emoji')
export class EmojiAdminController {
  constructor(private readonly emoji: EmojiService) {}

  private canSeeAll(user: AdminUser): boolean {
    return (
      AclService.has(user.permissions, PERMISSIONS.emojiUpdateAny) ||
      AclService.has(user.permissions, PERMISSIONS.emojiDeleteAny)
    );
  }

  private async loadEditablePack(
    user: AdminUser,
    id: string,
    action: PackAction,
  ): Promise<EmojiPackEntity> {
    const pack = await this.emoji.findPackEntity(id);
    const isOwner = pack.ownerId === user.id;

    const allowed =
      action === 'update'
        ? AclService.has(user.permissions, PERMISSIONS.emojiUpdateAny) ||
          (isOwner && AclService.has(user.permissions, PERMISSIONS.emojiUpdateOwn))
        : AclService.has(user.permissions, PERMISSIONS.emojiDeleteAny) ||
          (isOwner && AclService.has(user.permissions, PERMISSIONS.emojiDeleteOwn));

    if (!allowed) {
      throw new ForbiddenException(
        action === 'update' ? '只能修改自己创建的表情包' : '只能删除自己创建的表情包',
      );
    }

    return pack;
  }

  private async loadEditableImage(
    user: AdminUser,
    imageId: string,
    action: PackAction,
  ): Promise<EmojiImageEntity> {
    const image = await this.emoji.findImageEntity(imageId);
    await this.loadEditablePack(user, image.packId, action);
    return image;
  }

  @Get('packs')
  @RequireAnyPermission(...EMOJI_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台表情包列表（权限不足时仅返回自己创建的）' })
  findPacks(
    @CurrentUser() user: AdminUser,
    @Query() query: QueryEmojiPacksDto,
  ): Promise<Paginated<EmojiPack>> {
    return this.emoji.findAdminPacks(query, this.canSeeAll(user) ? undefined : user.id);
  }

  @Post('packs/bulk-delete')
  @RequirePermission(PERMISSIONS.emojiDeleteAny)
  @ApiOperation({ summary: '批量删除表情包' })
  bulkDelete(@Body() dto: BulkDeleteEmojiPacksDto) {
    return this.emoji.removeManyPacks(dto.ids ?? []);
  }

  @Get('packs/:id')
  @RequireAnyPermission(...EMOJI_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台表情包详情' })
  async findPack(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EmojiPack> {
    const pack = await this.emoji.findAdminPack(id);
    if (!this.canSeeAll(user) && pack.ownerId !== user.id) {
      throw new ForbiddenException('无权查看该表情包');
    }
    return pack;
  }

  @Post('packs')
  @RequirePermission(PERMISSIONS.emojiCreate)
  @ApiOperation({ summary: '创建表情包（自动记录归属人）' })
  createPack(
    @CurrentUser() user: AdminUser,
    @Body() dto: CreateEmojiPackDto,
  ): Promise<EmojiPack> {
    return this.emoji.createPack(dto, user.id);
  }

  @Patch('packs/:id')
  @ApiOperation({ summary: '修改表情包信息' })
  async updatePack(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmojiPackDto,
  ): Promise<EmojiPack> {
    await this.loadEditablePack(user, id, 'update');
    return this.emoji.updatePack(id, dto);
  }

  @Delete('packs/:id')
  @ApiOperation({ summary: '删除表情包及其全部表情' })
  async removePack(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.loadEditablePack(user, id, 'delete');
    return this.emoji.removePack(id);
  }

  @Post('packs/:id/images')
  @RequirePermission(PERMISSIONS.emojiCreate)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string', description: '表情名称，默认取文件名' },
        tags: { type: 'string', description: 'JSON 数组或逗号分隔' },
        watermarkText: { type: 'string', description: '填写后烧录水印' },
        watermarkPosition: { type: 'string' },
        watermarkOpacity: { type: 'number' },
        sortOrder: { type: 'integer' },
      },
    },
  })
  @ApiOperation({ summary: '上传表情（自动压缩为 WebP，可选烧录水印）' })
  async uploadImage(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: FastifyRequest,
  ): Promise<EmojiImage> {
    const pack = await this.emoji.findPackEntity(id);
    if (
      pack.ownerId !== user.id &&
      !AclService.has(user.permissions, PERMISSIONS.emojiUpdateAny)
    ) {
      throw new ForbiddenException('只能向自己的表情包上传表情');
    }

    const upload = await readEmojiUpload(req);
    return this.emoji.addImage(id, upload, user.id);
  }

  @Patch('images/:id')
  @ApiOperation({ summary: '重命名 / 修改标签 / 调整排序' })
  async updateImage(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmojiImageDto,
  ): Promise<EmojiImage> {
    const image = await this.loadEditableImage(user, id, 'update');
    return this.emoji.updateImage(image.id, dto);
  }

  @Delete('images/:id')
  @ApiOperation({ summary: '删除表情' })
  async removeImage(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    const image = await this.loadEditableImage(user, id, 'delete');
    return this.emoji.removeImage(image.id);
  }

  @Post('images/:id/cover')
  @ApiOperation({ summary: '设为表情包封面' })
  async setCover(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EmojiImage> {
    const image = await this.loadEditableImage(user, id, 'update');
    return this.emoji.setCover(image.id);
  }

  @Post('images/:id/watermark')
  @ApiOperation({ summary: '添加 / 更换 / 移除水印（传空文字即移除）' })
  async watermark(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyEmojiWatermarkDto,
  ): Promise<EmojiImage> {
    const image = await this.loadEditableImage(user, id, 'update');
    return this.emoji.applyWatermark(image.id, dto);
  }
}
