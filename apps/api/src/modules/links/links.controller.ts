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
import { BulkDeleteLinksDto, CreateLinkDto, UpdateLinkDto } from './dto/create-link.dto';
import { QueryLinksDto } from './dto/query-links.dto';
import { LinksService } from './links.service';

const LINK_VIEW_PERMISSIONS = [
  PERMISSIONS.linkCreate,
  PERMISSIONS.linkUpdateOwn,
  PERMISSIONS.linkUpdateAny,
  PERMISSIONS.linkDelete,
];

@ApiTags('同好外链（公开）')
@Controller('links')
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Get()
  @ApiOperation({ summary: '分页查询推荐站点' })
  findAll(@Query() query: QueryLinksDto) {
    return this.links.findPublished(query);
  }

  @Get('grouped')
  @ApiOperation({ summary: '按分类分组获取站点（导航页使用）' })
  findGrouped() {
    return this.links.findGroupedByCategory();
  }

  @Get('categories')
  @ApiOperation({ summary: '各分类站点数量' })
  getCategoryCounts() {
    return this.links.getCategoryCounts();
  }

  @Post(':id/click')
  @ApiOperation({ summary: '记录一次外链跳转' })
  recordClick(@Param('id', ParseUUIDPipe) id: string) {
    return this.links.recordClick(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '站点详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.links.findOnePublished(id);
  }
}

@ApiTags('同好外链（后台）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/links')
export class LinksAdminController {
  constructor(private readonly links: LinksService) {}

  /** 只有「能管全部外链」的权限才看全部，否则仅返回自己提交的 */
  private scopedOwnerId(user: AdminUser): string | undefined {
    const canSeeAll =
      AclService.has(user.permissions, PERMISSIONS.linkUpdateAny) ||
      AclService.has(user.permissions, PERMISSIONS.linkDelete);
    return canSeeAll ? undefined : user.id;
  }

  @Get()
  @RequireAnyPermission(...LINK_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台分页查询站点（含草稿；权限不足时仅返回自己提交的）' })
  findAll(@CurrentUser() user: AdminUser, @Query() query: QueryLinksDto) {
    return this.links.findAll(query, this.scopedOwnerId(user));
  }

  @Post('bulk-delete')
  @RequirePermission(PERMISSIONS.linkDelete)
  @ApiOperation({ summary: '批量删除站点' })
  bulkDelete(@Body() dto: BulkDeleteLinksDto) {
    return this.links.removeMany(dto.ids ?? []);
  }

  @Get(':id')
  @RequireAnyPermission(...LINK_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台站点详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.links.findOne(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.linkCreate)
  @ApiOperation({ summary: '新增站点（自动记录归属人）' })
  create(@CurrentUser() user: AdminUser, @Body() dto: CreateLinkDto) {
    return this.links.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新站点（非本人需 update.any）' })
  async update(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkDto,
  ) {
    const link = await this.links.findOne(id);
    const allowed =
      AclService.has(user.permissions, PERMISSIONS.linkUpdateAny) ||
      (AclService.has(user.permissions, PERMISSIONS.linkUpdateOwn) && link.ownerId === user.id);

    if (!allowed) throw new ForbiddenException('只能修改自己提交的外链站点');

    return this.links.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.linkDelete)
  @ApiOperation({ summary: '删除站点' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.links.remove(id);
  }
}
