import {
  ClassSerializerInterceptor,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { ConversationsService } from './conversations.service';
import { sendMessageDto } from './dtos/sendMessage.dto';
import { isUUIDDto } from './dtos/IsUUID.dto';
import { HttpExceptionTransformationFilter } from '../common/filters/HttpExceptionFilter.filter';
import { Block, User } from 'types';
import { createConversationDto } from './dtos/createConversation.dto';
import { updateRoleDto } from './dtos/updateRole.dto';
import { Conversation } from 'types';
import { muteUserDto } from './dtos/muteUser.dto';
import { isDateDto } from './dtos/isDate.dto';
import { conversationRestrictionEnum } from 'types';
import { ConversationsDetails, unreadMessagesResponse } from 'types';
import { Message } from 'types';
import { ConversationRole } from 'types';
import { UsersService } from '../users/users.service';
import { instanceToPlain } from 'class-transformer';
import { invitationDto } from './dtos/invitation.dto';
import { BlockUserDto } from './block-user.dto';

@UseFilters(HttpExceptionTransformationFilter)
@UsePipes(new ValidationPipe())
@UseInterceptors(ClassSerializerInterceptor)
@WebSocketGateway({
  namespace: 'conversations',
})
export class ConversationsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket): Promise<string | void> {
    console.error('Someone is trying to connect');
    if (!client.handshake.auth.token) {
      client.disconnect();
      return;
    }
    const currentUser = this.authService.verifyUserFromToken(
      client.handshake.auth.token,
    );
    if (!currentUser) {
      client.disconnect();
      return;
    }
    client.data = { id: currentUser.sub, name: currentUser.name };
    client.join(`user_${currentUser.sub}`);
    const conversations = await this.conversationsService.getConversationsIds(
      currentUser.sub,
    );
    conversations.forEach((el) => client.join(`conversation_${el}`));
    console.error(`new socket id: ${client.id}`);
    return 'Connection established';
  }

  handleDisconnect(client: any) {
    console.error(`Closed socket: ${client.id}`);
  }

  @SubscribeMessage('getConversations')
  getConversations(
    @ConnectedSocket() client: Socket,
  ): Promise<ConversationsDetails> {
    console.error('Getting conversations');
    return this.conversationsService.getConversations(client.data as User);
  }

  @SubscribeMessage('createConversation')
  async createConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() newConversation: createConversationDto,
  ): Promise<Conversation> {
    const { conversation, newConversationMessage } =
      await this.conversationsService.createConversation(
        newConversation,
        client.data as User,
      );
    if (newConversationMessage) {
      this.server
        .in(`user_${client.data.id}`)
        .socketsJoin(`conversation_${conversation.id}`);
      for (const participant of newConversation.participants) {
        this.server
          .in(`user_${participant}`)
          .socketsJoin(`conversation_${conversation.id}`);
      }
      client
        .to(`conversation_${conversation.id}`)
        .emit('newConversation', instanceToPlain(conversation));
    }
    return conversation;
  }

  @SubscribeMessage('getUnread')
  unreadCount(
    @ConnectedSocket() client: Socket,
  ): Promise<unreadMessagesResponse> {
    return this.conversationsService.unreadCount(client.data as User);
  }

  @SubscribeMessage('getMessages')
  getMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
  ): Promise<Message[]> {
    console.error('Fetching message');
    return this.conversationsService.getMessages(client.data as User, id);
  }

  @SubscribeMessage('postMessage')
  async postMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() { content }: sendMessageDto,
    @MessageBody() { id }: isUUIDDto,
  ): Promise<Message> {
    const ret = await this.conversationsService.postMessage(
      client.data as User,
      id,
      content,
    );
    if (ret)
      client
        .to(`conversation_${id}`)
        .emit('newMessage', { id, message: instanceToPlain(ret) });
    return ret;
  }

  @SubscribeMessage('read')
  async readMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
  ) {
    return this.conversationsService.readMessage(client.data as User, id);
  }

  @SubscribeMessage('inviteToConversation')
  async inviteToConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() invitation: invitationDto,
  ): Promise<boolean> {
    console.error(invitation);
    let DMId!: string;
    if (!invitation.conversationID) return false;
    const invitationMessage =
      await this.conversationsService.inviteToConversation(
        client.data as User,
        invitation,
      );
    console.error('invitationMessage: ', invitationMessage);
    if (!invitationMessage) return false;
    if (invitationMessage.conversation) {
      this.server
        .in(`user_${client.data.id}`)
        .socketsJoin(`conversation_${invitationMessage.conversation.id}`);
      this.server
        .in(`user_${invitation.target}`)
        .socketsJoin(`conversation_${invitationMessage.conversation.id}`);
      this.server
        .in(`conversation_${invitationMessage.conversation.id}`)
        .emit(
          'newConversation',
          instanceToPlain(invitationMessage.conversation),
        );
      DMId = invitationMessage.conversation.id;
    } else if (invitationMessage.prevConversation)
      DMId = invitationMessage.prevConversation;
    else DMId = '';
    this.server.in(`conversation_${DMId}`).emit('newMessage', {
      DMId,
      message: instanceToPlain(invitationMessage.message),
    });
    return true;
  }

  @SubscribeMessage('canJoinConversation')
  async canJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
  ) {
    return this.conversationsService.canJoinConversation(
      client.data as User,
      id,
    );
  }

  @SubscribeMessage('joinConversation')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
    @MessageBody('password') password: string | undefined,
  ): Promise<Conversation> {
    const { conversation, joinMessage } =
      await this.conversationsService.joinConversation(
        client.data as User,
        id,
        password ? password : null,
      );
    if (joinMessage) {
      this.server
        .in(`user_${client.data.id}`)
        .socketsJoin(`conversation_${conversation.id}`);
      this.server
        .in(`user_${client.data.id}`)
        .emit('newConversation', instanceToPlain(conversation));
      this.server
        .in(`conversation_${conversation.id}`)
        .except(`user_${client.data.id}`)
        .emit('userJoined', {
          id,
          user: instanceToPlain(
            await this.usersService.getById(client.data.id),
          ),
        });
      this.server
        .in(`conversation_${conversation.id}`)
        .emit('newMessage', { id, message: instanceToPlain(joinMessage) });
    }
    return conversation;
  }

  @SubscribeMessage('getParticipants')
  getConversationPartipants(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
  ): Promise<ConversationRole[]> {
    return this.conversationsService.getConversationParticipants(
      client.data as User,
      id,
    );
  }

  @SubscribeMessage('updateRole')
  async updateRole(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
    @MessageBody() newRole: updateRoleDto,
  ): Promise<updateRoleDto> {
    const role = await this.conversationsService.updateRole(
      id,
      newRole,
      client.data as User,
    );
    if (role) {
      client.to(`conversation_${id}`).emit('newRole', instanceToPlain(newRole));
    }
    return newRole;
  }

  @SubscribeMessage('DMExists')
  async DMExists(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
  ) {
    if (client.data.id === id)
      return { conversationExists: false, conversation: null };
    return this.conversationsService.DMExists(client.data as User, id);
  }

  @SubscribeMessage('leaveConversation')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id }: isUUIDDto,
  ): Promise<ConversationRole> {
    const { userRole, leftMessage } =
      await this.conversationsService.leaveConversation(
        client.data as User,
        id,
      );
    if (leftMessage) {
      this.server
        .in(`user_${client.data.id}`)
        .socketsLeave(`conversation_${id}`);
      client.to(`user_${client.data.id}`).emit('leaveConversation', id);
      this.server
        .in(`conversation_${id}`)
        .emit('userLeft', { id, user: instanceToPlain(userRole.user) });
      this.server
        .in(`conversation_${id}`)
        .emit('newMessage', { id, message: instanceToPlain(leftMessage) });
    }
    return userRole;
  }

  @SubscribeMessage('muteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id, username }: muteUserDto,
    @MessageBody() { date }: isDateDto,
  ): Promise<string> {
    const restriction = await this.conversationsService.restrictUser(
      client.data as User,
      id,
      username,
      conversationRestrictionEnum.MUTE,
      new Date(date),
    );
    client
      .to(`conversation_${id}`)
      .emit('mutedUser', instanceToPlain(restriction));
    return restriction;
  }

  @SubscribeMessage('banUser')
  async banUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id, username }: muteUserDto,
    @MessageBody() { date }: isDateDto,
  ): Promise<string> {
    const restriction = this.conversationsService.restrictUser(
      client.data as User,
      id,
      username,
      conversationRestrictionEnum.BAN,
      new Date(date),
    );
    client
      .to(`conversation_${id}`)
      .emit('bannedUser', instanceToPlain(restriction));
    this.server.in(`user_${id}`).socketsLeave(`conversation_${id}`);
    return restriction;
  }

  @SubscribeMessage('banUserIndefinitely')
  async banUserIndefinitely(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id, username }: muteUserDto,
  ): Promise<string> {
    const restriction = this.conversationsService.restrictUser(
      client.data as User,
      id,
      username,
      conversationRestrictionEnum.BAN,
      null,
    );
    client
      .to(`conversation_${id}`)
      .emit('bannedUser', instanceToPlain(restriction));
    this.server.in(`user_${id}`).socketsLeave(`conversation_${id}`);
    return restriction;
  }

  @SubscribeMessage('unbanUser')
  async unbanUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id, username }: muteUserDto,
  ) {
    return this.conversationsService.unbanUser(client.data as User, {
      id,
      username,
    });
  }

  @SubscribeMessage('unmuteUser')
  async unmuteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() { id, username }: muteUserDto,
  ) {
    return this.conversationsService.unmuteUser(client.data as User, {
      id,
      username,
    });
  }

  @SubscribeMessage('get_blocked_users')
  async getBlockedUsers(@ConnectedSocket() client: Socket): Promise<Block[]> {
    return this.conversationsService.getBlockedUsers(client.data.id);
  }

  @SubscribeMessage('block_user')
  async blockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() { targetId }: BlockUserDto,
  ): Promise<{ targetId: string | null }> {
    if (
      client.data.id === targetId ||
      (await this.conversationsService.blockExists(client.data.id, targetId))
    ) {
      return { targetId: null };
    }
    const source = await this.usersService.getById(client.data.id);
    const target = await this.usersService.getById(targetId);
    if (!source || !target) {
      return { targetId: null };
    }
    await this.conversationsService.blockUser(source, target);
    return { targetId };
  }

  @SubscribeMessage('unblock_user')
  async unblockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() { targetId }: BlockUserDto,
  ): Promise<{ targetId: string | null }> {
    if (client.data.id === targetId) return { targetId: null };
    await this.conversationsService.unblockUser(client.data.id, targetId);
    return { targetId };
  }
}
