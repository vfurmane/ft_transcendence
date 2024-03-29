import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from 'types';
import { Conversation } from 'types';
import { ConversationsService } from './conversations.service';
import { createConversationDto } from './dtos/createConversation.dto';
import { sendMessageDto } from './dtos/sendMessage.dto';
import { updateRoleDto } from './dtos/updateRole.dto';
import { isUUIDDto } from './dtos/IsUUID.dto';
import { muteUserDto } from './dtos/muteUser.dto';
import { conversationRestrictionEnum } from 'types';
import { isDateDto } from './dtos/isDate.dto';
import { User as CurrentUser } from '../common/decorators/user.decorator';
import { ConversationsDetails, unreadMessagesResponse } from 'types';
import { Message } from 'types';
import { ConversationRole } from 'types';

@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('/')
  getConversations(
    @CurrentUser() currentUser: User,
  ): Promise<ConversationsDetails> {
    return this.conversationsService.getConversations(currentUser);
  }

  @Put('/create')
  async createConversation(
    @CurrentUser() currentUser: User,
    @Body() newConversation: createConversationDto,
  ): Promise<Conversation> {
    return (
      await this.conversationsService.createConversation(
        newConversation,
        currentUser,
      )
    ).conversation;
  }

  @Get('/unread')
  unreadCount(
    @CurrentUser() currentUser: User,
  ): Promise<unreadMessagesResponse> {
    return this.conversationsService.unreadCount(currentUser);
  }

  @Get('/:id')
  getMessages(
    @CurrentUser() currentUser: User,
    @Param() { id }: isUUIDDto,
  ): Promise<Message[]> {
    return this.conversationsService.getMessages(currentUser, id);
  }

  @Post('/:id/post')
  postMessage(
    @CurrentUser() currentUser: User,
    @Param() { id }: isUUIDDto,
    @Body() { content }: sendMessageDto,
  ): Promise<Message> {
    return this.conversationsService.postMessage(currentUser, id, content);
  }

  @Get('/:id/join')
  async joinConversation(
    @CurrentUser() currentUser: User,
    @Param() { id }: isUUIDDto,
  ): Promise<Conversation> {
    return (
      await this.conversationsService.joinConversation(currentUser, id, null)
    ).conversation;
  }

  @Post('/:id/join')
  async joinProtectedConversation(
    @CurrentUser() currentUser: User,
    @Param() { id }: isUUIDDto,
    @Body('password') password: string,
  ): Promise<Conversation> {
    return (
      await this.conversationsService.joinConversation(
        currentUser,
        id,
        password,
      )
    ).conversation;
  }

  @Get('/:id/participants')
  getConversationParticipants(
    @CurrentUser() currentUser: User,
    @Param() { id }: isUUIDDto,
  ): Promise<ConversationRole[]> {
    return this.conversationsService.getConversationParticipants(
      currentUser,
      id,
    );
  }

  @Patch('/:id/updateRole')
  updateRole(
    @CurrentUser() CurrentUser: User,
    @Param() { id }: isUUIDDto,
    @Body() newRole: updateRoleDto,
  ): Promise<boolean> {
    return this.conversationsService.updateRole(id, newRole, CurrentUser);
  }

  @Delete('/:id/leave')
  async leaveConversation(
    @CurrentUser() currentUser: User,
    @Param() { id }: isUUIDDto,
  ): Promise<ConversationRole> {
    return (await this.conversationsService.leaveConversation(currentUser, id))
      .userRole;
  }

  @Patch('/:id/mute/:username')
  muteUser(
    @CurrentUser() currentUser: User,
    @Param() muteUser: muteUserDto,
    @Body() { date }: isDateDto,
  ): Promise<string> {
    return this.conversationsService.restrictUser(
      currentUser,
      muteUser.id,
      muteUser.username,
      conversationRestrictionEnum.MUTE,
      new Date(date),
    );
  }

  @Patch('/:id/ban/:username')
  banUser(
    @CurrentUser() currentUser: User,
    @Param() muteUser: muteUserDto,
    @Body() { date }: isDateDto,
  ): Promise<string> {
    return this.conversationsService.restrictUser(
      currentUser,
      muteUser.id,
      muteUser.username,
      conversationRestrictionEnum.BAN,
      new Date(date),
    );
  }

  @Get('/:id/ban/:username')
  banUserIndefinitely(
    @CurrentUser() currentUser: User,
    @Param() muteUser: muteUserDto,
  ): Promise<string> {
    return this.conversationsService.restrictUser(
      currentUser,
      muteUser.id,
      muteUser.username,
      conversationRestrictionEnum.BAN,
      null,
    );
  }
}
