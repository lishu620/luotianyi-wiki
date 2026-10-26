import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmojiImageEntity } from '../../entities/emoji-image.entity';
import { EmojiPackEntity } from '../../entities/emoji-pack.entity';
import { EmojiAdminController } from './emoji.admin.controller';
import { EmojiController } from './emoji.controller';
import { EmojiImageService } from './emoji-image.service';
import { EmojiStorageService } from './emoji-storage.service';
import { EmojiService } from './emoji.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmojiPackEntity, EmojiImageEntity])],
  controllers: [EmojiController, EmojiAdminController],
  providers: [EmojiService, EmojiImageService, EmojiStorageService],
  exports: [EmojiService, EmojiStorageService],
})
export class EmojiModule {}
