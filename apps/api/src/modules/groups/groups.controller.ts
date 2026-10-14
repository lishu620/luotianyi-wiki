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
import { BulkDeleteGroupsDto, CreateGroupDto, UpdateGroupDto } from './dto/create-group.dto';
import { QueryGroupsDto } from './dto/query-groups.dto';
import { GroupsService } from './groups.service';

@ApiTags('中V群聊（公开）')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  @ApiOperation({ summary: '分页查询群聊' })
  findAll(@Query() query: QueryGroupsDto) {
    return this.groups.findPublished(query);
  }

  @Get('grouped')
  @ApiOperation({ summary: '按栏目分组获取群聊（导航页使用）' })
  findGrouped() {
    return this.groups.findGrouped();
  }

  @Get('sections')
  @ApiOperation({ summary: '各栏目群聊数量' })
  getSectionCounts() {
    return this.groups.getSectionCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: '群聊详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groups.findOnePublished(id);
  }
}

const GROUP_VIEW_PERMISSIONS = [
  PERMISSIONS.groupCreate,
  PERMISSIONS.groupUpdateOwn,
  PERMISSIONS.groupUpdateAny,
  PERMISSIONS.groupDelete,
];

@ApiTags('中V群聊（后台）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/groups')
export class GroupsAdminController {
  constructor(private readonly groups: GroupsService) {}

  private scopedOwnerId(user: AdminUser): string | undefined {
    const canSeeAll =
      AclService.has(user.permissions, PERMISSIONS.groupUpdateAny) ||
      AclService.has(user.permissions, PERMISSIONS.groupDelete);
    return canSeeAll ? undefined : user.id;
  }

  @Get()
  @RequireAnyPermission(...GROUP_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台分页查询群聊（含草稿；权限不足时仅返回自己提交的）' })
  findAll(@CurrentUser() user: AdminUser, @Query() query: QueryGroupsDto) {
    return this.groups.findAll(query, this.scopedOwnerId(user));
  }

  @Post('bulk-delete')
  @RequirePermission(PERMISSIONS.groupDelete)
  @ApiOperation({ summary: '批量删除群聊' })
  bulkDelete(@Body() dto: BulkDeleteGroupsDto) {
    return this.groups.removeMany(dto.ids ?? []);
  }

  @Get(':id')
  @RequireAnyPermission(...GROUP_VIEW_PERMISSIONS)
  @ApiOperation({ summary: '后台群聊详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groups.findOne(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.groupCreate)
  @ApiOperation({ summary: '新增群聊（自动记录归属人）' })
  create(@CurrentUser() user: AdminUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新群聊（非本人需 update.any）' })
  async update(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const group = await this.groups.findOne(id);
    const allowed =
      AclService.has(user.permissions, PERMISSIONS.groupUpdateAny) ||
      (AclService.has(user.permissions, PERMISSIONS.groupUpdateOwn) && group.ownerId === user.id);

    if (!allowed) throw new ForbiddenException('只能修改自己提交的群聊');

    return this.groups.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.groupDelete)
  @ApiOperation({ summary: '删除群聊' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.groups.remove(id);
  }
}
