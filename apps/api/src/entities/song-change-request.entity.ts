import type { ChangeRequestStatus } from '@luotianyi/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 非本人（或权限不足者）对歌曲的修改申请，审批通过后写回歌曲 */
@Entity('song_change_requests')
@Index(['status', 'createdAt'])
export class SongChangeRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  songId: string;

  /** 申请人 */
  @Index()
  @Column({ type: 'uuid' })
  requesterId: string;

  /** 拟修改的字段（仅包含用户提交的键） */
  @Column({ type: 'jsonb' })
  changes: Record<string, unknown>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ChangeRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewerId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reviewNote: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
