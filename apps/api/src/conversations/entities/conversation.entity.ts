import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationRestriction } from './conversationRestriction.entity';
import { ConversationToUser } from './conversationToUser.entity';
import { Message } from './message.entity';

@Expose()
@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string

  @Column({default: false})
  groupConversation!: boolean

  @Exclude()
  @Column('varchar', { length: 255, nullable: true, default: null })
  password!: string

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Message, (message) => message.conversation, {cascade: true})
  messages!: Message[]

  @OneToMany(() => ConversationToUser, (conversationToUser) => conversationToUser.conversation, {cascade: true})
  conversationToUsers!: ConversationToUser[];

  @OneToMany(() => ConversationRestriction, (conversationRestriction) => conversationRestriction.conversation, {cascade: true})
  conversationRestrictions!: ConversationRestriction[]
}
