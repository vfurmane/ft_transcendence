import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard';
import { CurrentUser } from 'src/users/current-user.decorator';
import { User } from 'src/users/user.entity';
import { Conversation } from './conversation.entity';
import { ConversationsService } from './conversations.service';
import { createConversationDto } from './createConversation.dto';

@Controller('conversations')
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService){}

    @Post('/create')
    @UseGuards(JwtAuthGuard)
    createConversation(@Body() newConversation: createConversationDto, @CurrentUser() currentUser: User): Promise<Conversation>
    {
        return (this.conversationsService.createConversation(newConversation, currentUser));
    }

}
