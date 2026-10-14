import type { CommunityGroupSection, SongStatus } from '@luotianyi/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('community_groups')
@Index(['section', 'status'])
export class CommunityGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 群名 / 地区名 */
  @Index()
  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** QQ 群号（同一群号可能同时出现在演唱会群与地方群，故不设唯一约束） */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  number: string;

  /** 活跃度标记：★★ / ★ / ① / ② / ③ / ④ */
  @Column({ type: 'varchar', length: 8, nullable: true })
  level: string | null;

  /** 备注（同人展为举办日期） */
  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  /** 所属栏目 */
  @Index()
  @Column({ type: 'varchar', length: 30, default: 'other' })
  section: CommunityGroupSection;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

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
