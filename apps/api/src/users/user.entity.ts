import { Exclude, Expose } from 'class-transformer';
import { ConversationToUser } from 'src/conversations/entities/conversationToUser.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Message } from '../conversations/entities/message.entity';

@Exclude()
@Entity()
export class User {
  @Expose()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column('varchar', { length: 255, unique: true })
  email!: string;

  @Expose()
  @Column('varchar', { length: 30, unique: true })
  name!: string;

  @Column('varchar', { length: 255, nullable: true })
  password!: string | null;

  @Expose()
  @OneToMany(()=> Message, (message) => message.sender)
  messages!: Message[];

  @Expose()
  @OneToMany(() => ConversationToUser, (conversationToUser) => conversationToUser.user)
  conversationToUsers!: ConversationToUser[]; 
}
