import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Achievements {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 30 })
  title!: string;

  @Column("varchar", { length: 300 })
  description!: string;

  @Column("smallint", { default: 0 })
  logo!: number;
  /*@ManyToMany(() => User)
    @JoinTable()
    users!: User[]*/

  @ManyToOne(() => User, (user) => user.achievements)
  user!: User;

  @CreateDateColumn()
  created_at!: Date;
}
