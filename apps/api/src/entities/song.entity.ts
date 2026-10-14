import type { SongStatus, VocalType } from '@luotianyi/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('songs')
@Index(['status', 'releaseYear'])
@Index(['playCount'])
export class SongEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 200 })
  title: string;

  /** 标题拼音，便于「tianyi」「lyqx」这类拼音检索 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  titlePinyin: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  aliases: string[];

  /** P 主 / 投稿者 */
  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  producer: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  lyricist: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  composer: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  arranger: string | null;

  @Column({ type: 'varchar', length: 20, default: 'solo' })
  vocalType: VocalType;

  /** 除洛天依以外的合唱者 */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  featuredSingers: string[];

  @Column({ type: 'date', nullable: true })
  releaseDate: string | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  releaseYear: number | null;

  /** 时长（秒） */
  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({ type: 'int', default: 0 })
  playCount: number;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  lyrics: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  coverUrl: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  bilibiliUrl: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  youtubeUrl: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  neteaseUrl: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  qqMusicUrl: string | null;

  /** 是否为代表作 / 名曲 */
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'published' })
  status: SongStatus;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  /** 创建者（投稿人）ID */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
