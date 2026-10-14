import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SearchIndexerService } from '../modules/search/search-indexer.service';

/** 搜索索引重建 CLI：pnpm reindex */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Reindex');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const result = await app.get(SearchIndexerService).reindexAll();

    if (!result.meilisearchReady) {
      logger.warn('Meilisearch 不可用，未重建索引。请先启动 Meilisearch 后重试。');
    } else {
      logger.log(`索引重建完成：歌曲 ${result.songs} 首，外链 ${result.links} 个`);
    }
  } catch (error) {
    logger.error(`索引重建失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
