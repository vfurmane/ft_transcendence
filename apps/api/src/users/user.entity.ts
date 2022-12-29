import { State } from '../auth/state.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => State, (state) => state.user)
  states!: State[];

  @Column('varchar', { length: 255, unique: true })
  email!: string;

  @Column('varchar', { length: 30, unique: true })
  name!: string;

  @Column('varchar', { length: 255, nullable: true })
  password!: string | null;

  @Column('varchar', { length: 255, nullable: true })
  tfa_secret!: string | null;

  @Column('boolean', { default: false })
  tfa_setup!: boolean;
}
