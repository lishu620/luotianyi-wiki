import type { CnCardStyle, CnGender, CnPurpose, CnStatus } from '@luotianyi/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cn_profiles')
export class CnProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 所属用户（一个用户一个扩列条） */
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  /** 圈名 */
  @Index()
  @Column({ type: 'varchar', length: 60 })
  cn: string;

  @Column({ type: 'varchar', length: 600, nullable: true })
  avatarUrl: string | null;

  /** B 站 UID（填写后可一键同步 B 站头像） */
  @Column({ type: 'varchar', length: 32, nullable: true })
  bilibiliUid: string | null;

  /** 个人介绍卡款式 */
  @Column({ type: 'varchar', length: 16, default: 'classic' })
  cardStyle: CnCardStyle;

  @Column({ type: 'varchar', length: 10, default: 'secret' })
  gender: CnGender;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Index()
  @Column({ type: 'varchar', length: 60, nullable: true })
  region: string | null;

  /** 性格标签 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  personality: string | null;

  /** 扩列宣言 */
  @Column({ type: 'text', nullable: true })
  declaration: string | null;

  /** 兴趣标签 */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  interests: string[];

  /** 想找的搭子类型 */
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  lookingFor: string[];

  /** 用途：仅展示 / 想扩列 */
  @Index()
  @Column({ type: 'varchar', length: 12, default: 'display' })
  purpose: CnPurpose;

  /** 联系方式（仅在互相心动/本人/管理员时返回） */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  contacts: Record<string, string>;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'visible' })
  status: CnStatus;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
