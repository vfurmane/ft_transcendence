import { Exclude, Expose } from "class-transformer";
import { User } from "src/users/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { conversationRestrictionEnum } from "../conversationRestriction.enum";
import { Conversation } from "./conversation.entity";

@Exclude()
@Entity()
export class ConversationRestriction
{
    @PrimaryGeneratedColumn('uuid')
    id!: string

    @ManyToOne(() => User, {eager: true})
    issuer!: User

    @ManyToOne(() => User, {eager: true})
    target!: User

    @ManyToOne(() => Conversation)
    conversation!: Conversation

    @Expose()
    @Column({
        type: "enum",
        enum: conversationRestrictionEnum,
    })
    status!: conversationRestrictionEnum

    @Column({ type: 'timestamptz', nullable: true })
    until!: Date | null
}