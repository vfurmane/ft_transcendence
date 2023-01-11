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
import { ConversationRoleEnum } from '../conversationRole.enum';
import { Exclude, Expose, Transform } from 'class-transformer';
import { ConversationRestriction } from './conversationRestriction.entity';

@Expose()
@Entity()
export class ConversationRole {
  @Exclude()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: "enum",
    enum: ConversationRoleEnum,
    default: ConversationRoleEnum.USER
  })
  role!: ConversationRoleEnum;

  @Column()
  lastRead!: Date;

  @ManyToOne(() => User, (user) => user.conversationRoles, {eager: true})
  user!: User;

  @ManyToOne(()=> Conversation, (conversation) => conversation.conversationRoles)
  conversation!: Conversation;

  @OneToMany(() => ConversationRestriction, (conversationRestriction) => conversationRestriction.target, {eager: true, cascade: true})
  restrictions!: ConversationRestriction[];
}
