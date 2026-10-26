import type {
  EmojiCategory,
  EmojiPackStatus,
  EmojiWatermarkPosition,
} from '@luotianyi/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmojiImageEntity } from './emoji-image.entity';

@Entity('emoji_packs')
@Index(['status', 'category'])
export class EmojiPackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'other' })
  category: EmojiCategory;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  /** 封面表情 ID（为空时回退到第一张表情） */
  @Column({ type: 'uuid', nullable: true })
  coverImageId: string | null;

  /** 冗余保存封面地址，列表接口无需额外查询 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  coverKey: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'published' })
  status: EmojiPackStatus;

  /** 水印默认配置：上传时由用户决定是否启用 */
  @Column({ type: 'boolean', default: false })
  watermarkEnabled: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  watermarkText: string | null;

  @Column({ type: 'varchar', length: 20, default: 'bottom-right' })
  watermarkPosition: EmojiWatermarkPosition;

  @Column({ type: 'real', default: 0.6 })
  watermarkOpacity: number;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => EmojiImageEntity, (image) => image.pack)
  images: EmojiImageEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
