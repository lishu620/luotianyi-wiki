import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SongEntity } from '../../entities/song.entity';
import { MeilisearchModule } from '../search/meilisearch.module';
import { SongsAdminController } from './songs.admin.controller';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';

@Module({
  imports: [TypeOrmModule.forFeature([SongEntity]), MeilisearchModule],
  controllers: [SongsController, SongsAdminController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
