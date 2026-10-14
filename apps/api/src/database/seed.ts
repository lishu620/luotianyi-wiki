import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

/**
 * 种子数据 CLI：pnpm seed [-- --force]
 * --force 会清空既有歌曲与外链后重新写入。
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Seed');
  const force = process.argv.includes('--force');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const result = await app.get(SeedService).run(force);
    logger.log('种子数据写入完成');
    logger.log(
      `管理员=${result.admin} | 介绍分节=${result.profileSections} | 歌曲=${result.songs} | 外链=${result.links} | 群聊=${result.groups}`,
    );
    if (result.skipped.length > 0) {
      logger.warn(`已跳过：${result.skipped.join('，')}`);
    }
  } catch (error) {
    logger.error(`种子数据写入失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
