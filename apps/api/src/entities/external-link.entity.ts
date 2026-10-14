import type { LinkCategory, SongStatus } from '@luotianyi/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('external_links')
@Index(['category', 'status'])
export class ExternalLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'varchar', length: 600 })
  url: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'other' })
  category: LinkCategory;

  /** 站点图标（favicon 或 CDN 图片） */
  @Column({ type: 'varchar', length: 600, nullable: true })
  iconUrl: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  /** 官方或强烈推荐 */
  @Column({ type: 'boolean', default: false })
  recommended: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'published' })
  status: SongStatus;

  /** 创建者 ID */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
