import type {
  EmojiCategory,
  EmojiImage,
  EmojiImageSearchMatch,
  EmojiImageSearchResult,
  EmojiPack,
  Paginated,
} from '@luotianyi/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import { In, Repository, type SelectQueryBuilder } from 'typeorm';
import { buildPaginated, escapeLikeKeyword, normalizeStringArray } from '../../common/utils';
import { EmojiImageEntity } from '../../entities/emoji-image.entity';
import { EmojiPackEntity } from '../../entities/emoji-pack.entity';
import {
  ApplyEmojiWatermarkDto,
  CreateEmojiPackDto,
  QueryEmojiPacksDto,
  UpdateEmojiImageDto,
  UpdateEmojiPackDto,
} from './dto/emoji.dto';
import { EmojiImageService } from './emoji-image.service';
import {
  parseFloatField,
  parseIntegerField,
  parseTagsField,
  type EmojiUploadInput,
} from './emoji-multipart.util';
import { EmojiStorageService } from './emoji-storage.service';

interface ImageCountCarrier {
  imageCount?: number;
}

@Injectable()
export class EmojiService {
  private readonly searchMaxDistance: number;

  constructor(
    @InjectRepository(EmojiPackEntity)
    private readonly packs: Repository<EmojiPackEntity>,
    @InjectRepository(EmojiImageEntity)
    private readonly images: Repository<EmojiImageEntity>,
    private readonly processor: EmojiImageService,
    private readonly storage: EmojiStorageService,
    config: ConfigService,
  ) {
    this.searchMaxDistance = Math.min(
      Math.max(Number(config.get<number>('upload.emojiSearchMaxDistance') ?? 12), 0),
      64,
    );
  }

  /* ------------------------------------------------------------------ */
  /* 查询                                                                */
  /* ------------------------------------------------------------------ */

  private applyFilters(
    qb: SelectQueryBuilder<EmojiPackEntity>,
    query: QueryEmojiPacksDto,
    options: { publicOnly: boolean; ownerId?: string },
  ): void {
    if (options.publicOnly) {
      qb.andWhere('pack.status = :status', { status: 'published' });
    } else if (query.status) {
      qb.andWhere('pack.status = :status', { status: query.status });
    }

    if (query.category) qb.andWhere('pack.category = :category', { category: query.category });
    if (options.ownerId) qb.andWhere('pack."ownerId" = :ownerId', { ownerId: options.ownerId });

    if (query.keyword?.trim()) {
      const kw = `%${escapeLikeKeyword(query.keyword.trim())}%`;
      qb.andWhere(
        `(pack.name ILIKE :kw OR coalesce(pack.description, '') ILIKE :kw OR array_to_string(pack.tags, ' ') ILIKE :kw)`,
        { kw },
      );
    }
  }

  private async paginate(
    query: QueryEmojiPacksDto,
    options: { publicOnly: boolean; ownerId?: string },
  ): Promise<Paginated<EmojiPack>> {
    const qb = this.packs.createQueryBuilder('pack').where('1 = 1');
    this.applyFilters(qb, query, options);

    const order = query.order ?? 'DESC';
    switch (query.sortBy) {
      case 'name':
        qb.orderBy('pack.name', query.order ?? 'ASC');
        break;
      case 'imageCount':
        qb.orderBy(
          `(SELECT COUNT(*) FROM emoji_images img WHERE img."packId" = pack.id)`,
          order,
        );
        break;
      case 'createdAt':
        qb.orderBy('pack.createdAt', order);
        break;
      case 'updatedAt':
        qb.orderBy('pack.updatedAt', order).addOrderBy('pack.sortOrder', 'ASC');
        break;
      default:
        qb.orderBy('pack.sortOrder', 'ASC').addOrderBy('pack.updatedAt', order);
        break;
    }
    qb.addOrderBy('pack.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .loadRelationCountAndMap('pack.imageCount', 'pack.images');

    const [items, total] = await qb.getManyAndCount();
    return buildPaginated(items.map((item) => this.toPack(item)), total, query.page, query.pageSize);
  }

  findPublicPacks(query: QueryEmojiPacksDto): Promise<Paginated<EmojiPack>> {
    return this.paginate(query, { publicOnly: true });
  }

  findAdminPacks(query: QueryEmojiPacksDto, ownerId?: string): Promise<Paginated<EmojiPack>> {
    return this.paginate(query, { publicOnly: false, ownerId });
  }

  async getCategoryCounts(): Promise<Array<{ category: EmojiCategory; count: number }>> {
    const rows = (await this.packs.query(
      `SELECT category, COUNT(*)::int AS count FROM emoji_packs WHERE status = 'published' GROUP BY category`,
    )) as Array<{ category: EmojiCategory; count: number }>;

    return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
  }

  async getStats(): Promise<{ packCount: number; imageCount: number }> {
    const row = (await this.packs.query(
      `SELECT
         (SELECT COUNT(*)::int FROM emoji_packs WHERE status = 'published') AS "packCount",
         (SELECT COUNT(*)::int FROM emoji_images i
            INNER JOIN emoji_packs p ON p.id = i."packId"
            WHERE p.status = 'published') AS "imageCount"`,
    )) as Array<{ packCount: number; imageCount: number }>;

    return {
      packCount: Number(row[0]?.packCount ?? 0),
      imageCount: Number(row[0]?.imageCount ?? 0),
    };
  }

  async findPublicPack(id: string, viewerId?: string): Promise<EmojiPack> {
    const pack = await this.packs.findOne({ where: { id }, relations: ['images'] });
    if (!pack) throw new NotFoundException('未找到该表情包');

    if (pack.status !== 'published' && pack.ownerId !== viewerId) {
      throw new NotFoundException('未找到该表情包');
    }

    return this.toPack(pack, pack.images);
  }

  async findAdminPack(id: string): Promise<EmojiPack> {
    const pack = await this.packs.findOne({ where: { id }, relations: ['images'] });
    if (!pack) throw new NotFoundException('未找到该表情包');
    return this.toPack(pack, pack.images);
  }

  async findPackEntity(id: string): Promise<EmojiPackEntity> {
    const pack = await this.packs.findOne({ where: { id } });
    if (!pack) throw new NotFoundException('未找到该表情包');
    return pack;
  }

  async findImageEntity(id: string): Promise<EmojiImageEntity> {
    const image = await this.images.findOne({ where: { id } });
    if (!image) throw new NotFoundException('未找到该表情');
    return image;
  }

  /* ------------------------------------------------------------------ */
  /* 表情包                                                              */
  /* ------------------------------------------------------------------ */

  private normalizePack(dto: CreateEmojiPackDto): Partial<EmojiPackEntity> {
    return {
      name: dto.name?.trim(),
      description: dto.description?.trim() || null,
      category: dto.category ?? 'other',
      tags: normalizeStringArray(dto.tags),
      status: dto.status ?? 'published',
      watermarkEnabled: dto.watermarkEnabled ?? false,
      watermarkText: dto.watermarkText?.trim() || null,
      watermarkPosition: dto.watermarkPosition ?? 'bottom-right',
      watermarkOpacity: clampOpacity(dto.watermarkOpacity ?? 0.6),
      sortOrder: clampSortOrder(dto.sortOrder ?? 0),
    };
  }

  async createPack(dto: CreateEmojiPackDto, ownerId?: string | null): Promise<EmojiPack> {
    const entity = this.packs.create({ ...this.normalizePack(dto), ownerId: ownerId ?? null });
    const saved = await this.packs.save(entity);
    return this.toPack(saved, []);
  }

  async updatePack(id: string, dto: UpdateEmojiPackDto): Promise<EmojiPack> {
    const pack = await this.findPackEntity(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('表情包名称不能为空');
      pack.name = name;
    }
    if (dto.description !== undefined) pack.description = dto.description?.trim() || null;
    if (dto.category !== undefined) pack.category = dto.category;
    if (dto.tags !== undefined) pack.tags = normalizeStringArray(dto.tags);
    if (dto.status !== undefined) pack.status = dto.status;
    if (dto.watermarkEnabled !== undefined) pack.watermarkEnabled = dto.watermarkEnabled;
    if (dto.watermarkText !== undefined) pack.watermarkText = dto.watermarkText?.trim() || null;
    if (dto.watermarkPosition !== undefined) pack.watermarkPosition = dto.watermarkPosition;
    if (dto.watermarkOpacity !== undefined) pack.watermarkOpacity = clampOpacity(dto.watermarkOpacity);
    if (dto.sortOrder !== undefined) pack.sortOrder = clampSortOrder(dto.sortOrder);

    const saved = await this.packs.save(pack);
    const imageCount = await this.images.count({ where: { packId: id } });
    return this.toPack(saved, undefined, imageCount);
  }

  async removePack(id: string): Promise<{ success: boolean }> {
    const pack = await this.packs.findOne({ where: { id }, relations: ['images'] });
    if (!pack) throw new NotFoundException('未找到该表情包');

    const keys = new Set<string>();
    for (const image of pack.images ?? []) {
      keys.add(image.baseKey);
      keys.add(image.storageKey);
    }
    if (pack.coverKey) keys.add(pack.coverKey);

    await this.packs.remove(pack);
    await Promise.all([...keys].map((key) => this.storage.remove(key)));
    return { success: true };
  }

  async removeManyPacks(ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) return { deleted: 0 };

    const packs = await this.packs.find({ where: { id: In(ids) }, relations: ['images'] });
    for (const pack of packs) {
      await this.removePack(pack.id);
    }
    return { deleted: packs.length };
  }

  /* ------------------------------------------------------------------ */
  /* 表情图片                                                            */
  /* ------------------------------------------------------------------ */

  async addImage(packId: string, input: EmojiUploadInput, ownerId?: string | null): Promise<EmojiImage> {
    const pack = await this.findPackEntity(packId);
    const fields = input.fields;

    const name =
      fields.name?.trim().slice(0, 120) ||
      stripExtension(basename(input.filename)).slice(0, 120) ||
      '未命名表情';
    const tags = normalizeStringArray(parseTagsField(fields.tags) ?? []);
    const watermarkText = (fields.watermarkText ?? '').trim().slice(0, 120);
    const watermarkPosition = isWatermarkPosition(fields.watermarkPosition)
      ? fields.watermarkPosition
      : pack.watermarkPosition;
    const watermarkOpacity = clampOpacity(
      parseFloatField(fields.watermarkOpacity, pack.watermarkOpacity) ?? pack.watermarkOpacity,
    );

    const processed = await this.processor.process(
      input.buffer,
      watermarkText ? { text: watermarkText, position: watermarkPosition, opacity: watermarkOpacity } : null,
    );
    // 用压缩后的底图计算哈希，保证「上传同一张已存图片」时能命中 distance = 0
    const hash = await this.processor.computeHash(processed.base.buffer);

    const id = randomUUID();
    const baseKey = this.storage.buildKey(id);
    let watermarkedKey: string | null = null;
    let savedImageId: string | null = null;

    try {
      await this.storage.write(baseKey, processed.base.buffer);
      if (processed.watermarked) {
        watermarkedKey = this.storage.buildKey(`${id}-wm`);
        await this.storage.write(watermarkedKey, processed.watermarked.buffer);
      }

      const finalImage = processed.watermarked ?? processed.base;
      const sortOrder = clampSortOrder(
        parseIntegerField(fields.sortOrder) ?? (await this.nextSortOrder(packId)),
      );

      const entity = this.images.create({
        id,
        packId,
        name,
        tags,
        baseKey,
        storageKey: watermarkedKey ?? baseKey,
        mimeType: 'image/webp',
        width: finalImage.width,
        height: finalImage.height,
        fileSize: finalImage.fileSize,
        originalName: basename(input.filename).slice(0, 255) || null,
        hash,
        watermarkText: processed.watermarked ? watermarkText : null,
        ownerId: ownerId ?? null,
        sortOrder,
      });

      const saved = await this.images.save(entity);
      savedImageId = saved.id;

      if (!pack.coverImageId) {
        pack.coverImageId = saved.id;
        pack.coverKey = saved.storageKey;
        await this.packs.save(pack);
      } else {
        await this.packs.update(pack.id, { updatedAt: () => 'CURRENT_TIMESTAMP' });
      }

      return this.toImage(saved);
    } catch (error) {
      if (savedImageId) await this.images.delete(savedImageId).catch(() => undefined);
      await this.storage.remove(baseKey);
      await this.storage.remove(watermarkedKey);
      throw error;
    }
  }

  async updateImage(id: string, dto: UpdateEmojiImageDto): Promise<EmojiImage> {
    const image = await this.findImageEntity(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('表情名称不能为空');
      image.name = name;
    }
    if (dto.tags !== undefined) image.tags = normalizeStringArray(dto.tags);
    if (dto.sortOrder !== undefined) image.sortOrder = clampSortOrder(dto.sortOrder);

    const saved = await this.images.save(image);
    return this.toImage(saved);
  }

  async removeImage(id: string): Promise<{ success: boolean }> {
    const image = await this.findImageEntity(id);
    const pack = await this.findPackEntity(image.packId);

    await this.images.remove(image);

    if (pack.coverImageId === id) {
      const next = await this.images.findOne({
        where: { packId: pack.id },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      pack.coverImageId = next?.id ?? null;
      pack.coverKey = next?.storageKey ?? null;
      await this.packs.save(pack);
    } else {
      await this.packs.update(pack.id, { updatedAt: () => 'CURRENT_TIMESTAMP' });
    }

    await this.storage.remove(image.baseKey);
    if (image.storageKey !== image.baseKey) await this.storage.remove(image.storageKey);

    return { success: true };
  }

  async setCover(imageId: string): Promise<EmojiImage> {
    const image = await this.findImageEntity(imageId);
    const pack = await this.findPackEntity(image.packId);

    pack.coverImageId = image.id;
    pack.coverKey = image.storageKey;
    await this.packs.save(pack);

    return this.toImage(image);
  }

  async applyWatermark(imageId: string, dto: ApplyEmojiWatermarkDto): Promise<EmojiImage> {
    const image = await this.findImageEntity(imageId);
    const pack = await this.findPackEntity(image.packId);
    const text = dto.text.trim().slice(0, 120);

    if (!text) {
      // 移除水印：切回无水印底图
      const oldKey = image.storageKey;
      image.storageKey = image.baseKey;
      image.watermarkText = null;
      const saved = await this.images.save(image);
      if (oldKey !== image.baseKey) await this.storage.remove(oldKey);

      if (pack.coverImageId === image.id) {
        pack.coverKey = saved.storageKey;
        await this.packs.save(pack);
      }
      return this.toImage(saved);
    }

    const baseBuffer = await this.storage.read(image.baseKey);
    const watermarked = await this.processor.applyWatermark(baseBuffer, {
      text,
      position: dto.position ?? pack.watermarkPosition,
      opacity: clampOpacity(dto.opacity ?? pack.watermarkOpacity),
    });

    const newKey = this.storage.buildKey(`${image.id}-${randomUUID().slice(0, 8)}`);
    await this.storage.write(newKey, watermarked.buffer);

    const oldKey = image.storageKey;
    image.storageKey = newKey;
    image.watermarkText = text;
    image.width = watermarked.width;
    image.height = watermarked.height;
    image.fileSize = watermarked.fileSize;

    const saved = await this.images.save(image);
    if (oldKey !== image.baseKey && oldKey !== newKey) await this.storage.remove(oldKey);

    if (pack.coverImageId === image.id) {
      pack.coverKey = newKey;
      await this.packs.save(pack);
    }

    return this.toImage(saved);
  }

  /* ------------------------------------------------------------------ */
  /* 以图搜图                                                            */
  /* ------------------------------------------------------------------ */

  async searchByImage(
    input: Buffer,
    options: { limit?: number; maxDistance?: number } = {},
  ): Promise<EmojiImageSearchResult> {
    let hash: string;
    try {
      hash = await this.processor.computeNormalizedHash(input);
    } catch {
      throw new BadRequestException('无法解析图片，请上传 JPG / PNG / WebP / GIF 等常见格式');
    }

    const requestedLimit = Number(options.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 30)
      : 12;
    const requestedDistance = Number(options.maxDistance);
    const maxDistance = Number.isFinite(requestedDistance)
      ? Math.min(Math.max(Math.trunc(requestedDistance), 0), 64)
      : this.searchMaxDistance;

    const rows = (await this.images.query(
      `SELECT i.id, i."packId", i.hash
       FROM emoji_images i
       INNER JOIN emoji_packs p ON p.id = i."packId"
       WHERE p.status = 'published'`,
    )) as Array<{ id: string; packId: string; hash: string }>;

    const scored = rows
      .filter((row) => row.hash)
      .map((row) => ({
        id: row.id,
        packId: row.packId,
        distance: EmojiImageService.distance(hash, row.hash),
      }))
      .filter((row) => row.distance <= maxDistance)
      .sort((left, right) => left.distance - right.distance);

    if (scored.length === 0) return { hash, matches: [], packs: [] };

    const bestPerPack = new Map<string, (typeof scored)[number]>();
    for (const row of scored) {
      if (!bestPerPack.has(row.packId)) bestPerPack.set(row.packId, row);
    }

    const packHits = [...bestPerPack.values()].slice(0, limit);
    const imageHits = scored.slice(0, limit);
    const imageIds = [...new Set([...packHits, ...imageHits].map((row) => row.id))];
    const packIds = [...new Set([...packHits, ...imageHits].map((row) => row.packId))];

    const [imageEntities, packEntities] = await Promise.all([
      this.images.find({ where: { id: In(imageIds) } }),
      this.packs
        .createQueryBuilder('pack')
        .where('pack.id IN (:...packIds)', { packIds })
        .loadRelationCountAndMap('pack.imageCount', 'pack.images')
        .getMany(),
    ]);

    const imageMap = new Map(imageEntities.map((image) => [image.id, this.toImage(image)]));
    const packMap = new Map(packEntities.map((pack) => [pack.id, this.toPack(pack)]));

    const buildMatch = (row: (typeof scored)[number]): EmojiImageSearchMatch | null => {
      const image = imageMap.get(row.id);
      const pack = packMap.get(row.packId);
      if (!image || !pack) return null;

      return {
        distance: row.distance,
        similarity: Math.round((1 - row.distance / 64) * 1000) / 1000,
        image,
        pack,
      };
    };

    return {
      hash,
      matches: imageHits.map(buildMatch).filter((item): item is EmojiImageSearchMatch => Boolean(item)),
      packs: packHits.map(buildMatch).filter((item): item is EmojiImageSearchMatch => Boolean(item)),
    };
  }

  /* ------------------------------------------------------------------ */
  /* 映射                                                                */
  /* ------------------------------------------------------------------ */

  private async nextSortOrder(packId: string): Promise<number> {
    const row = await this.images
      .createQueryBuilder('image')
      .select('COALESCE(MAX(image.sortOrder), -1) + 1', 'next')
      .where('image.packId = :packId', { packId })
      .getRawOne<{ next: string | number }>();

    return Number(row?.next ?? 0);
  }

  private toImage(entity: EmojiImageEntity): EmojiImage {
    return {
      id: entity.id,
      packId: entity.packId,
      name: entity.name,
      tags: entity.tags ?? [],
      storageKey: entity.storageKey,
      url: this.storage.urlOf(entity.storageKey) ?? '',
      mimeType: entity.mimeType,
      width: entity.width,
      height: entity.height,
      fileSize: entity.fileSize,
      originalName: entity.originalName,
      hash: entity.hash,
      watermarkText: entity.watermarkText,
      ownerId: entity.ownerId,
      sortOrder: entity.sortOrder,
      createdAt: new Date(entity.createdAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString(),
    };
  }

  private toPack(
    entity: EmojiPackEntity,
    images?: EmojiImageEntity[],
    imageCountOverride?: number,
  ): EmojiPack {
    const sortedImages = images
      ? [...images].sort((left, right) => left.sortOrder - right.sortOrder)
      : undefined;
    const imageCount =
      imageCountOverride ??
      sortedImages?.length ??
      (entity as EmojiPackEntity & ImageCountCarrier).imageCount ??
      0;

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      category: entity.category,
      tags: entity.tags ?? [],
      coverImageId: entity.coverImageId,
      coverUrl: this.storage.urlOf(entity.coverKey),
      status: entity.status,
      watermarkEnabled: entity.watermarkEnabled,
      watermarkText: entity.watermarkText,
      watermarkPosition: entity.watermarkPosition,
      watermarkOpacity: entity.watermarkOpacity,
      ownerId: entity.ownerId,
      imageCount,
      sortOrder: entity.sortOrder,
      ...(sortedImages ? { images: sortedImages.map((image) => this.toImage(image)) } : {}),
      createdAt: new Date(entity.createdAt).toISOString(),
      updatedAt: new Date(entity.updatedAt).toISOString(),
    };
  }
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return 0.6;
  return Math.min(Math.max(value, 0.05), 1);
}

function clampSortOrder(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), -999_999), 999_999);
}

function stripExtension(filename: string): string {
  const extension = extname(filename);
  return extension ? filename.slice(0, -extension.length) : filename;
}

function isWatermarkPosition(value: string | undefined): value is EmojiPack['watermarkPosition'] {
  return (
    value === 'top-left' ||
    value === 'top-right' ||
    value === 'bottom-left' ||
    value === 'bottom-right' ||
    value === 'center'
  );
}
