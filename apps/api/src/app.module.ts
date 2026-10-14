import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AclModule } from './modules/acl/acl.module';
import { AuthModule } from './modules/auth/auth.module';
import { CnModule } from './modules/cn/cn.module';
import { GroupsModule } from './modules/groups/groups.module';
import { LinksModule } from './modules/links/links.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RolesModule } from './modules/roles/roles.module';
import { SearchModule } from './modules/search/search.module';
import { SongRequestsModule } from './modules/song-requests/song-requests.module';
import { SongsModule } from './modules/songs/songs.module';
import { StatsModule } from './modules/stats/stats.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        // 开发期自动同步表结构；生产请关闭并改用 migration
        synchronize: config.get<boolean>('database.synchronize'),
        logging: config.get<boolean>('database.logging'),
        extra: { max: 10 },
      }),
    }),

    UsersModule,
    AclModule,
    AuthModule,
    RolesModule,
    SongsModule,
    LinksModule,
    GroupsModule,
    ProfileModule,
    SongRequestsModule,
    CnModule,
    StatsModule,
    SearchModule,
    DatabaseModule,
  ],
})
export class AppModule {}
