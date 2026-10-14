import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 「心动」记录：from -> to（to 为被心动的用户 ID） */
@Entity('cn_likes')
@Index(['fromUserId', 'toUserId'], { unique: true })
export class CnLikeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  fromUserId: string;

  @Index()
  @Column({ type: 'uuid' })
  toUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
