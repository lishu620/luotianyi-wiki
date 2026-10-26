import type { EmojiWatermarkPosition } from '@luotianyi/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);
const MAX_INPUT_PIXELS = 40_000_000;

export interface WatermarkOptions {
  text: string;
  position?: EmojiWatermarkPosition;
  opacity?: number;
}

export interface EncodedImage {
  buffer: Buffer;
  width: number;
  height: number;
  fileSize: number;
}

export interface ProcessedEmoji {
  base: EncodedImage;
  /** 只有需要水印时才生成 */
  watermarked: EncodedImage | null;
}

@Injectable()
export class EmojiImageService {
  private readonly maxDimension: number;
  private readonly quality: number;

  constructor(config: ConfigService) {
    this.maxDimension = Math.min(
      Math.max(Number(config.get<number>('upload.emojiMaxDimension') ?? 1080), 128),
      2048,
    );
    this.quality = Math.min(Math.max(Number(config.get<number>('upload.emojiQuality') ?? 82), 40), 100);
  }

  /** 校验格式、压缩为 WebP，并按需生成水印版本 */
  async process(input: Buffer, watermark?: WatermarkOptions | null): Promise<ProcessedEmoji> {
    const metadata = await sharp(input, {
      animated: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .metadata()
      .catch(() => null);

    if (!metadata?.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new BadRequestException('仅支持 JPG / PNG / WebP / GIF / AVIF / TIFF 图片');
    }
    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('无法读取图片尺寸，请更换图片后重试');
    }

    const base = await this.encode(input);
    const watermarked = watermark?.text?.trim()
      ? await this.applyWatermark(base.buffer, watermark)
      : null;

    return { base, watermarked };
  }

  /** 对已压缩的底图添加水印（会重新编码，但不改变感知哈希） */
  async applyWatermark(input: Buffer, options: WatermarkOptions): Promise<EncodedImage> {
    const text = options.text.trim().slice(0, 120);
    if (!text) throw new BadRequestException('水印文字不能为空');

    const metadata = await sharp(input, { animated: true }).metadata();
    const width = metadata.width;
    const height = metadata.pageHeight ?? metadata.height;
    if (!width || !height) throw new BadRequestException('无法读取图片尺寸');

    const svg = this.buildWatermarkSvg(width, height, {
      text,
      position: options.position ?? 'bottom-right',
      opacity: options.opacity ?? 0.6,
    });

    const output = await sharp(input, { animated: true })
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .webp({ quality: this.quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.pageHeight ?? output.info.height,
      fileSize: output.info.size,
    };
  }

  /**
   * 计算「规范化后」的 dHash：先用与上传一致的方式压缩为 WebP，再计算哈希。
   * 这样同一张图无论以 PNG / JPG / WebP 查询都能得到一致结果。
   */
  async computeNormalizedHash(input: Buffer): Promise<string> {
    const metadata = await sharp(input, {
      animated: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .metadata()
      .catch(() => null);

    if (!metadata?.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new BadRequestException('仅支持 JPG / PNG / WebP / GIF / AVIF / TIFF 图片');
    }

    const encoded = await this.encode(input);
    return this.computeHash(encoded.buffer);
  }

  /** 计算 64 位 dHash（十六进制） */
  async computeHash(input: Buffer): Promise<string> {
    const metadata = await sharp(input, {
      animated: false,
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .metadata()
      .catch(() => null);

    if (!metadata?.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new BadRequestException('仅支持 JPG / PNG / WebP / GIF / AVIF / TIFF 图片');
    }

    const { data } = await sharp(input, {
      animated: false,
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .greyscale()
      .resize(9, 8, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (data.length < 72) throw new BadRequestException('图片解析失败，请更换图片后重试');

    let bits = '';
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const index = row * 9 + col;
        bits += data[index] < data[index + 1] ? '1' : '0';
      }
    }

    return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
  }

  /** 汉明距离：0 表示完全一致，64 表示完全不同 */
  static distance(left: string, right: string): number {
    let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
    let count = 0;
    while (value > 0n) {
      count += Number(value & 1n);
      value >>= 1n;
    }
    return count;
  }

  private async encode(input: Buffer): Promise<EncodedImage> {
    const output = await sharp(input, {
      animated: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: this.maxDimension,
        height: this.maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: this.quality, effort: 4, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.pageHeight ?? output.info.height,
      fileSize: output.info.size,
    };
  }

  private buildWatermarkSvg(
    width: number,
    height: number,
    options: WatermarkOptions & { position: EmojiWatermarkPosition; opacity: number },
  ): string {
    const text = escapeXml(options.text);
    const padding = Math.max(8, Math.round(width * 0.035));
    const maxTextWidth = Math.max(40, width - padding * 2);
    const fontByWidth = Math.floor(maxTextWidth / Math.max(1, [...options.text].length));
    const fontSize = Math.max(
      10,
      Math.min(Math.round(width * 0.05), Math.round(height * 0.12), fontByWidth),
    );

    let x = padding;
    let y = padding + fontSize;
    let anchor: 'start' | 'middle' | 'end' = 'start';
    let baseline: 'auto' | 'middle' = 'auto';

    switch (options.position) {
      case 'top-right':
        x = width - padding;
        anchor = 'end';
        break;
      case 'bottom-left':
        y = height - padding;
        break;
      case 'bottom-right':
        x = width - padding;
        y = height - padding;
        anchor = 'end';
        break;
      case 'center':
        x = width / 2;
        y = height / 2;
        anchor = 'middle';
        baseline = 'middle';
        break;
      default:
        break;
    }

    const strokeWidth = Math.max(1, Math.round(fontSize * 0.08));
    const opacity = Math.min(Math.max(options.opacity, 0.05), 1);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}"
        font-family="Noto Sans CJK SC, Noto Sans SC, Microsoft YaHei, PingFang SC, sans-serif"
        font-size="${fontSize}" font-weight="600"
        fill="#ffffff" fill-opacity="${opacity}"
        stroke="#000000" stroke-opacity="${(opacity * 0.45).toFixed(2)}"
        stroke-width="${strokeWidth}" paint-order="stroke">${text}</text>
    </svg>`;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
