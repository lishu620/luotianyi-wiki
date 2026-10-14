import type { AdminUser } from '@luotianyi/shared';
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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../../common/decorators/permissions.decorator';
import { AclService } from '../acl/acl.service';
import { PermissionsGuard } from '../acl/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/create-song.dto';
import { BulkDeleteDto, QuerySongsDto } from './dto/query-songs.dto';
import { SongsService } from './songs.service';

/** 只要能接触到歌曲模块，就允许查看（范围由权限决定） */
const SONG_VIEW_PERMISSIONS = [
  PERMISSIONS.songCreate,
  PERMISSIONS.songUpdateOwn,
  PERMISSIONS.songUpdateAny,
  PERMISSIONS.songDelete,
  PERMISSIONS.songApprove,
];

@ApiTags('歌曲（后台）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/songs')
export class SongsAdminController {
  constructor(private readonly songs: SongsService) {}

  /** 只有「能管全部歌曲」的权限才看全部，否则仅返回自己投稿的 */
  private scopedOwnerId(user: AdminUser): string | undefined {
    const canSeeAll =
      AclService.has(user.permissions, PERMISSIONS.songUpdateAny) ||
      AclService.has(user.permissions, PERMISSIONS.songDelete) ||
      AclService.has(user.permissions, PERMISSIONS.songApprove);
    return canSeeAll ? undefined : user.id;
  }

  @Get()
  @RequireAnyPermission(...SONG_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台分页查询歌曲（含草稿；权限不足时仅返回自己的投稿）' })
  findAll(@CurrentUser() user: AdminUser, @Query() query: QuerySongsDto) {
    return this.songs.findAll(query, this.scopedOwnerId(user));
  }

  @Post('bulk-delete')
  @RequirePermission(PERMISSIONS.songDelete)
  @ApiOperation({ summary: '批量删除歌曲' })
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.songs.removeMany(dto.ids ?? []);
  }

  @Get(':id')
  @RequireAnyPermission(...SONG_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台歌曲详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.songs.findOne(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.songCreate)
  @ApiOperation({ summary: '新增歌曲（自动记录归属人）' })
  create(@CurrentUser() user: AdminUser, @Body() dto: CreateSongDto) {
    return this.songs.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新歌曲（非本人需 update.any，否则请走修改申请）' })
  async update(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSongDto,
  ) {
    const song = await this.songs.findOne(id);
    const allowed =
      AclService.has(user.permissions, PERMISSIONS.songUpdateAny) ||
      (AclService.has(user.permissions, PERMISSIONS.songUpdateOwn) && song.ownerId === user.id);

    if (!allowed) {
      throw new ForbiddenException('非本人歌曲不能直接修改，请提交「修改申请」等待原投稿人或管理员审批');
    }

    return this.songs.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.songDelete)
  @ApiOperation({ summary: '删除歌曲' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.songs.remove(id);
  }
}
