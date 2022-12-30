import { User } from 'src/users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { conversationRole } from './conversationRole.enum';

@Entity()
export class ConversationToUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: "enum",
    enum: conversationRole,
    default: conversationRole.USER
  })
  role!: conversationRole;

  @Column()
  lastRead!: Date;

  @ManyToOne(() => User, (user) => user.conversationToUsers)
  user!: User;

  @ManyToOne(()=> Conversation, (conversation) => conversation.conversationToUsers)
  conversation!: Conversation;
}
