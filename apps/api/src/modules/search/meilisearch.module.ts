import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalLinkEntity } from '../../entities/external-link.entity';
import { SongEntity } from '../../entities/song.entity';
import { MeilisearchService } from './meilisearch.service';
import { SearchIndexerService } from './search-indexer.service';

@Module({
  imports: [TypeOrmModule.forFeature([SongEntity, ExternalLinkEntity])],
  providers: [MeilisearchService, SearchIndexerService],
  exports: [MeilisearchService, SearchIndexerService],
})
export class MeilisearchModule {}
