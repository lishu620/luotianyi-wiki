import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

/** 静态资源访问前缀，与 main.ts 中的 useStaticAssets 保持一致 */
export const UPLOAD_URL_PREFIX = '/api/uploads';

@Injectable()
export class EmojiStorageService implements OnModuleInit {
  private readonly logger = new Logger(EmojiStorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('upload.dir') ?? 'uploads');
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    this.logger.log(`表情文件存储目录：${this.root}`);
  }

  getRoot(): string {
    return this.root;
  }

  /** 生成按年月分目录的存储键 */
  buildKey(id: string, extension = 'webp'): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `emoji/${now.getFullYear()}/${month}/${id}.${extension}`;
  }

  urlOf(key: string | null | undefined): string | null {
    if (!key) return null;
    return `${UPLOAD_URL_PREFIX}/${key.split(sep).join('/')}`;
  }

  /** 将存储键解析为绝对路径，并阻止路径穿越 */
  absolutePath(key: string): string {
    const full = resolve(this.root, key);
    if (full !== this.root && !full.startsWith(`${this.root}${sep}`)) {
      throw new Error(`非法存储路径：${key}`);
    }
    return full;
  }

  async write(key: string, buffer: Buffer): Promise<void> {
    const full = this.absolutePath(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, buffer);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.absolutePath(key));
  }

  async remove(key: string | null | undefined): Promise<void> {
    if (!key) return;
    try {
      await unlink(this.absolutePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
