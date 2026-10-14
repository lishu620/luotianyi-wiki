import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroupsModule } from '../modules/groups/groups.module';
import { LinksModule } from '../modules/links/links.module';
import { ProfileModule } from '../modules/profile/profile.module';
import { RolesModule } from '../modules/roles/roles.module';
import { MeilisearchModule } from '../modules/search/meilisearch.module';
import { SongsModule } from '../modules/songs/songs.module';
import { UsersModule } from '../modules/users/users.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    RolesModule,
    SongsModule,
    LinksModule,
    GroupsModule,
    ProfileModule,
    MeilisearchModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}
