import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileSectionEntity } from '../../entities/profile-section.entity';
import { ProfileAdminController, ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileSectionEntity])],
  controllers: [ProfileController, ProfileAdminController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
