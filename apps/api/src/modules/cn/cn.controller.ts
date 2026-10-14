import type { AdminUser } from '@luotianyi/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../acl/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CnService } from './cn.service';
import { CnStatusDto, QueryCnDto, UpsertCnProfileDto } from './dto/cn.dto';

@ApiTags('CN 扩列条（公开）')
@Controller('cn')
export class CnController {
  constructor(private readonly cn: CnService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '扩列广场列表（keyword/interest/region/gender/sort）' })
  findAll(@CurrentUser() user: AdminUser | undefined, @Query() query: QueryCnDto) {
    return this.cn.findAll(query, user?.id);
  }

  @Get('heart')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '心动推荐（按兴趣重合度）' })
  async heart(@CurrentUser() user: AdminUser | undefined, @Query('limit') limit?: string) {
    const take = Math.min(Math.max(Number(limit ?? 12) || 12, 1), 48);
    return this.cn.findHeart(user?.id, take);
  }

  @Get('filters')
  @ApiOperation({ summary: '广场筛选项（兴趣标签与地区）' })
  filters() {
    return this.cn.getFilters();
  }

  @Get('bilibili-avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '按 B 站 UID / 主页获取头像（一键同步）' })
  bilibiliAvatar(@Query('uid') uid: string) {
    return this.cn.fetchBilibiliProfile(uid ?? '');
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '我的扩列条' })
  mine(@CurrentUser() user: AdminUser) {
    return this.cn.findMine(user.id);
  }

  @Put('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '创建 / 更新我的扩列条' })
  upsertMine(@CurrentUser() user: AdminUser, @Body() dto: UpsertCnProfileDto) {
    return this.cn.upsertMine(user.id, dto);
  }

  @Delete('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '删除我的扩列条' })
  removeMine(@CurrentUser() user: AdminUser) {
    return this.cn.removeMine(user.id);
  }

  @Get('my-likes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '我对谁心动过（用户 ID 列表）' })
  myLikes(@CurrentUser() user: AdminUser) {
    return this.cn.findMyLikes(user.id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '对他/她心动（可撤销）' })
  like(@CurrentUser() user: AdminUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.cn.like(id, user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '扩列条详情' })
  findOne(@CurrentUser() user: AdminUser | undefined, @Param('id', ParseUUIDPipe) id: string) {
    return this.cn.findOne(id, user?.id);
  }
}

@ApiTags('CN 扩列条（后台）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(PERMISSIONS.cnManage)
@Controller('admin/cn')
export class CnAdminController {
  constructor(private readonly cn: CnService) {}

  @Get()
  @ApiOperation({ summary: '后台扩列条列表' })
  list(@Query() query: QueryCnDto) {
    return this.cn.adminList(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '设置展示 / 隐藏' })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CnStatusDto) {
    return this.cn.adminSetStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除扩列条' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cn.adminRemove(id);
  }
}
