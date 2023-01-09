import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationToUser } from './entities/conversationToUser.entity';
import { UsersModule } from 'src/users/users.module';
import { ConversationRestriction } from './entities/conversationRestriction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    TypeOrmModule.forFeature([Conversation]),
    TypeOrmModule.forFeature([ConversationToUser]),
    TypeOrmModule.forFeature([ConversationRestriction]),
    UsersModule
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService]
})
export class ConversationsModule {}
