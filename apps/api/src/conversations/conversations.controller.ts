import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth-guard';
import { CurrentUser } from 'src/users/current-user.decorator';
import { User } from 'src/users/user.entity';
import { Conversation } from './conversation.entity';
import { ConversationsService } from './conversations.service';
import { createConversationDto } from './dtos/createConversation.dto';
import { sendMessageDto } from './dtos/sendMessage.dto';
import { updateRoleDto } from './dtos/updateRole.dto';

@Controller('conversations')
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService){}

    @Post('/create')
    @UseGuards(JwtAuthGuard)
    createConversation(@Body() newConversation: createConversationDto, @CurrentUser() currentUser: User): Promise<Conversation>
    {
        return (this.conversationsService.createConversation(newConversation, currentUser));
    }

    @Post('/updateRole')
    @UseGuards(JwtAuthGuard)
    updateRole(@Body() newRole: updateRoleDto, @CurrentUser() CurrentUser: User): Promise<boolean>
    {
        return this.conversationsService.updateRole(newRole, CurrentUser);
    }

    @Get('/')
    @UseGuards(JwtAuthGuard)
    getConversations(@CurrentUser() currentUser: User)
    {
        return (this.conversationsService.getConversations(currentUser));
    }

    @Get('/unreadCount')
    @UseGuards(JwtAuthGuard)
    unreadCount(@CurrentUser() currentUser: User)
    {
        return (this.conversationsService.unreadCount(currentUser));
    }

    @Get('/:id')
    @UseGuards(JwtAuthGuard)
    getMessages(@CurrentUser() currentUser: User, @Param('id') conversationId: string)
    {
        return (this.conversationsService.getMessages(currentUser, conversationId));
    }

    @Post('/:id/postMessage')
    @UseGuards(JwtAuthGuard)
    postMessage(@Param('id') conversationId: string, @Body() content: sendMessageDto, @CurrentUser() currentUser: User)
    {
        return (this.conversationsService.postMessage(currentUser, conversationId, content.content));
    }
}
