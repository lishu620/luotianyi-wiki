import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalLinkEntity } from '../../entities/external-link.entity';
import { MeilisearchModule } from '../search/meilisearch.module';
import { LinksAdminController, LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalLinkEntity]), MeilisearchModule],
  controllers: [LinksController, LinksAdminController],
  providers: [LinksService],
  exports: [LinksService],
})
export class LinksModule {}
