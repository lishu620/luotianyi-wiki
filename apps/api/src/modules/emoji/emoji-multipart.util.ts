import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
// 仅导入类型增强：FastifyRequest.parts() 由 @fastify/multipart 的模块声明合并提供，
// 单独引入本文件（如 seed 脚本）时也需要它参与编译。
import '@fastify/multipart';
import type { FastifyRequest } from 'fastify';

export interface EmojiUploadInput {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  fields: Record<string, string>;
}

/** 读取单个文件 + 其余文本字段（字段顺序无关） */
export async function readEmojiUpload(req: FastifyRequest): Promise<EmojiUploadInput> {
  const fields: Record<string, string> = {};
  let upload: { buffer: Buffer; filename: string; mimetype: string } | null = null;

  try {
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        if (upload) {
          part.file.resume();
          continue;
        }
        const buffer = await part.toBuffer();
        upload = {
          buffer,
          filename: part.filename ?? 'image',
          mimetype: part.mimetype || 'application/octet-stream',
        };
      } else {
        fields[part.fieldname] = Buffer.isBuffer(part.value)
          ? part.value.toString('utf8')
          : String(part.value);
      }
    }
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'FST_REQ_FILE_TOO_LARGE' || code === 'FST_FILES_LIMIT') {
      throw new PayloadTooLargeException('图片过大，请压缩后再上传');
    }
    throw new BadRequestException('图片上传失败，请重试');
  }

  if (!upload) throw new BadRequestException('请在 file 字段中上传图片');

  return { ...upload, fields };
}

export function parseTagsField(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const text = value.trim();
  if (!text) return [];

  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // 兼容逗号分隔的输入
    }
  }

  return text
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseIntegerField(value: string | undefined, fallback?: number): number | undefined {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function parseFloatField(value: string | undefined, fallback?: number): number | undefined {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseBooleanField(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}
