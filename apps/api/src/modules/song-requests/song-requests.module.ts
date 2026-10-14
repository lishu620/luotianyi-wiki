import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SongChangeRequestEntity } from '../../entities/song-change-request.entity';
import { SongEntity } from '../../entities/song.entity';
import { UserEntity } from '../../entities/user.entity';
import { MeilisearchModule } from '../search/meilisearch.module';
import {
  SongRequestSubmitController,
  SongRequestsController,
} from './song-requests.controller';
import { SongRequestsService } from './song-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SongChangeRequestEntity, SongEntity, UserEntity]),
    MeilisearchModule,
  ],
  controllers: [SongRequestsController, SongRequestSubmitController],
  providers: [SongRequestsService],
  exports: [SongRequestsService],
})
export class SongRequestsModule {}
