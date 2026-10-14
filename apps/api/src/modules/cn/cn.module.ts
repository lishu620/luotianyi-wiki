import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CnLikeEntity } from '../../entities/cn-like.entity';
import { CnProfileEntity } from '../../entities/cn-profile.entity';
import { UserEntity } from '../../entities/user.entity';
import { CnAdminController, CnController } from './cn.controller';
import { CnService } from './cn.service';

@Module({
  imports: [TypeOrmModule.forFeature([CnProfileEntity, CnLikeEntity, UserEntity])],
  controllers: [CnController, CnAdminController],
  providers: [CnService],
  exports: [CnService],
})
export class CnModule {}
