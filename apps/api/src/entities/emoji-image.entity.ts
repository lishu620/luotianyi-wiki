import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmojiPackEntity } from './emoji-pack.entity';

@Entity('emoji_images')
@Index(['packId', 'sortOrder'])
export class EmojiImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  packId: string;

  @ManyToOne(() => EmojiPackEntity, (pack) => pack.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'packId' })
  pack: EmojiPackEntity;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  /** 无水印的压缩底图相对路径（相对 UPLOAD_DIR），用于重新加水印或移除水印 */
  @Column({ type: 'varchar', length: 300 })
  baseKey: string;

  /** 当前对外展示的 WebP 相对路径；未加水印时与 baseKey 相同 */
  @Column({ type: 'varchar', length: 300 })
  storageKey: string;

  @Column({ type: 'varchar', length: 60 })
  mimeType: string;

  @Column({ type: 'int' })
  width: number;

  @Column({ type: 'int' })
  height: number;

  /** 压缩后文件大小（字节） */
  @Column({ type: 'int' })
  fileSize: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalName: string | null;

  /** 64 位 dHash，十六进制字符串 */
  @Index()
  @Column({ type: 'char', length: 16 })
  hash: string;

  /** 已烧录的水印文字；为空表示未加水印 */
  @Column({ type: 'varchar', length: 120, nullable: true })
  watermarkText: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
