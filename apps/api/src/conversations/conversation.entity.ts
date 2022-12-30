import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationToUser } from './conversationToUser.entity';
import { Message } from './message.entity';

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string

  @Column({default: false})
  public!: boolean

  @Column('varchar', { length: 255, nullable: true, default: null })
  password!: string

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Message, (message) => message.conversation)
  messages!: Message[]

  @OneToMany(() => ConversationToUser, (conversationToUser) => conversationToUser.conversation)
  conversationToUsers!: ConversationToUser[];
}
