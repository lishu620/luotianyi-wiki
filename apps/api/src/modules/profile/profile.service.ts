import type { ProfileSlug } from '@luotianyi/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileSectionEntity } from '../../entities/profile-section.entity';
import { CreateProfileSectionDto, UpdateProfileSectionDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileSectionEntity)
    private readonly sections: Repository<ProfileSectionEntity>,
  ) {}

  findAll(): Promise<ProfileSectionEntity[]> {
    return this.sections.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  findPublished(): Promise<ProfileSectionEntity[]> {
    return this.sections.find({
      where: { published: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findBySlug(slug: ProfileSlug, onlyPublished = true): Promise<ProfileSectionEntity> {
    const section = await this.sections.findOne({
      where: onlyPublished ? { slug, published: true } : { slug },
    });

    if (!section) throw new NotFoundException(`未找到分节：${slug}`);
    return section;
  }

  async findOne(id: string): Promise<ProfileSectionEntity> {
    const section = await this.sections.findOne({ where: { id } });
    if (!section) throw new NotFoundException('未找到该分节');
    return section;
  }

  async create(dto: CreateProfileSectionDto): Promise<ProfileSectionEntity> {
    const exists = await this.sections.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException(`分节 ${dto.slug} 已存在，请改用更新接口`);

    const entity = this.sections.create({
      slug: dto.slug,
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      content: dto.content ?? '',
      data: dto.data ?? null,
      icon: dto.icon ?? null,
      sortOrder: dto.sortOrder ?? 0,
      published: dto.published ?? true,
    });

    return this.sections.save(entity);
  }

  async update(id: string, dto: UpdateProfileSectionDto): Promise<ProfileSectionEntity> {
    const section = await this.findOne(id);

    if (dto.title !== undefined) section.title = dto.title;
    if (dto.subtitle !== undefined) section.subtitle = dto.subtitle || null;
    if (dto.content !== undefined) section.content = dto.content;
    if (dto.data !== undefined) section.data = dto.data;
    if (dto.icon !== undefined) section.icon = dto.icon || null;
    if (dto.sortOrder !== undefined) section.sortOrder = dto.sortOrder;
    if (dto.published !== undefined) section.published = dto.published;

    return this.sections.save(section);
  }

  /** 按 slug 覆盖式写入：不存在则创建，存在则更新（后台批量保存用）。 */
  async upsertBySlug(dto: CreateProfileSectionDto): Promise<ProfileSectionEntity> {
    const existing = await this.sections.findOne({ where: { slug: dto.slug } });
    if (!existing) return this.create(dto);

    return this.update(existing.id, dto);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const section = await this.findOne(id);
    await this.sections.remove(section);
    return { success: true };
  }
}
