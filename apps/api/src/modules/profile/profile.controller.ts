import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PROFILE_SLUGS, type ProfileSlug } from '@luotianyi/shared';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../acl/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProfileSectionDto, UpdateProfileSectionDto } from './dto/profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('洛天依介绍（公开）')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: '获取全部已发布分节' })
  findAll() {
    return this.profile.findPublished();
  }

  @Get('slugs')
  @ApiOperation({ summary: '可用的分节标识列表' })
  getSlugs(): readonly ProfileSlug[] {
    return PROFILE_SLUGS;
  }

  @Get(':slug')
  @ApiOperation({ summary: '按标识获取单个分节' })
  findBySlug(@Param('slug') slug: ProfileSlug) {
    return this.profile.findBySlug(slug, true);
  }
}

@ApiTags('洛天依介绍（后台）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(PERMISSIONS.profileUpdate)
@Controller('admin/profile')
export class ProfileAdminController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: '获取全部分节（含未发布）' })
  findAll() {
    return this.profile.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '分节详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.profile.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '新增分节' })
  create(@Body() dto: CreateProfileSectionDto) {
    return this.profile.create(dto);
  }

  @Post('upsert')
  @ApiOperation({ summary: '按 slug 新增或更新分节' })
  upsert(@Body() dto: CreateProfileSectionDto) {
    return this.profile.upsertBySlug(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新分节' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProfileSectionDto) {
    return this.profile.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除分节' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.profile.remove(id);
  }
}
