import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityGroupEntity } from '../../entities/community-group.entity';
import { GroupsAdminController, GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityGroupEntity])],
  controllers: [GroupsController, GroupsAdminController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
