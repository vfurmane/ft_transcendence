import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { conversationRole } from './conversationRole.enum';
import { ConversationToUser } from './conversationToUser.entity';
import { createConversationDto } from './createConversation.dto';

@Injectable()
export class ConversationsService {
    constructor(
        @InjectRepository(Conversation) private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(ConversationToUser) private readonly conversationToUserRepository: Repository<ConversationToUser>
    ) {}

    async createConversation(newConversation : createConversationDto, creator: User): Promise<Conversation>
    {
        const createdConversation = this.conversationRepository.create(newConversation);
        const conversationToUser = this.conversationToUserRepository.create({lastRead: new Date(), role: conversationRole.OWNER, user: creator, conversation: createdConversation})
        
        return (await (this.conversationToUserRepository.save(conversationToUser))).conversation;
    }
}
