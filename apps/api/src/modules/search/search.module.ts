import { Module } from '@nestjs/common';
import { LinksModule } from '../links/links.module';
import { SongsModule } from '../songs/songs.module';
import { MeilisearchModule } from './meilisearch.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [MeilisearchModule, SongsModule, LinksModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
