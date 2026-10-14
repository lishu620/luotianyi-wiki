import type { AdminUser } from '@luotianyi/shared';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateSongRequestDto,
  QuerySongRequestsDto,
  ReviewSongRequestDto,
} from './dto/song-request.dto';
import { SongRequestsService } from './song-requests.service';

@ApiTags('歌曲修改申请（后台）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('admin/song-requests')
export class SongRequestsController {
  constructor(private readonly requests: SongRequestsService) {}

  @Get()
  @ApiOperation({ summary: '修改申请列表（按权限自动限定范围）' })
  findAll(@CurrentUser() user: AdminUser, @Query() query: QuerySongRequestsDto) {
    return this.requests.findAll(user, query);
  }

  @Get('pending-count')
  @ApiOperation({ summary: '待我审批的申请数量' })
  pendingCount(@CurrentUser() user: AdminUser) {
    return this.requests.pendingCount(user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '通过修改申请（写回歌曲）' })
  approve(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewSongRequestDto,
  ) {
    return this.requests.approve(user, id, dto.note);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '驳回修改申请' })
  reject(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewSongRequestDto,
  ) {
    return this.requests.reject(user, id, dto.note);
  }
}

@ApiTags('歌曲修改申请（提交）')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('admin/songs')
export class SongRequestSubmitController {
  constructor(private readonly requests: SongRequestsService) {}

  @Post(':id/change-request')
  @ApiOperation({ summary: '提交歌曲修改申请（非本人编辑时使用）' })
  create(
    @CurrentUser() user: AdminUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSongRequestDto,
  ) {
    return this.requests.create(user, id, dto);
  }
}
