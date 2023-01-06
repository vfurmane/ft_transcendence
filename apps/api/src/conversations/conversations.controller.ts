import { Body, ClassSerializerInterceptor, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard';
import { CurrentUser } from 'src/users/current-user.decorator';
import { User } from 'src/users/user.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationsService } from './conversations.service';
import { createConversationDto } from './dtos/createConversation.dto';
import { sendMessageDto } from './dtos/sendMessage.dto';
import { updateRoleDto } from './dtos/updateRole.dto';
import { paramIsUUIDDto } from './dtos/paramIsUUID.dto';

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService){}


    @Get('/')
    getConversations(@CurrentUser() currentUser: User)
    {
        return (this.conversationsService.getConversations(currentUser));
    }

    @Post('/create')
    createConversation(@Body() newConversation: createConversationDto, @CurrentUser() currentUser: User): Promise<Conversation>
    {
        console.log("here");
        return (this.conversationsService.createConversation(newConversation, currentUser));
    }

    @Post('/updateRole')
    updateRole(@Body() newRole: updateRoleDto, @CurrentUser() CurrentUser: User): Promise<boolean>
    {
        return this.conversationsService.updateRole(newRole, CurrentUser);
    }

    @Get('/unread')
    unreadCount(@CurrentUser() currentUser: User)
    {
        return (this.conversationsService.unreadCount(currentUser));
    }

    @Get('/:id')
    getMessages(@CurrentUser() currentUser: User, @Param() conversationId: paramIsUUIDDto)
    {
        return (this.conversationsService.getMessages(currentUser, conversationId.id));
    }

    @Post('/:id/post')
    postMessage(@Param() conversationId: paramIsUUIDDto, @Body() content: sendMessageDto, @CurrentUser() currentUser: User)
    {
        return (this.conversationsService.postMessage(currentUser, conversationId.id, content.content));
    }

    @Get('/:id/join')
    joinConversation(@Param() conversationId: paramIsUUIDDto, @CurrentUser() currentUser : User)
    {
        return this.conversationsService.joinConversation(currentUser, conversationId.id, null);
    }

    @Post('/:id/join')
    joinProtectedConversation(@Param() conversationId: paramIsUUIDDto, @CurrentUser() currentUser : User, @Body() password: string)
    {
        return this.conversationsService.joinConversation(currentUser, conversationId.id, password);
    }

    @Get('/:id/participants')
    getConversationParticipants(@Param() conversationId: paramIsUUIDDto, @CurrentUser() currentUser : User)
    {
        return this.conversationsService.getConversationParticipants(currentUser, conversationId.id);
    }
}
