import type { ProfileSectionData, ProfileSlug } from '@luotianyi/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('profile_sections')
export class ProfileSectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  slug: ProfileSlug;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  subtitle: string | null;

  /** 支持 Markdown 子集 */
  @Column({ type: 'text', default: '' })
  content: string;

  /** 结构化数据：facts / gallery / timeline 等 */
  @Column({ type: 'jsonb', nullable: true })
  data: ProfileSectionData | null;

  /** Element Plus 图标名，例如 'MagicStick' */
  @Column({ type: 'varchar', length: 60, nullable: true })
  icon: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  published: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
