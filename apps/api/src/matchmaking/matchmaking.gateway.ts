import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import {
  ClassSerializerInterceptor,
  Logger,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JoinQueueDto } from './join-queue.dto';
import { UsersService } from 'src/users/users.service';
import { HttpExceptionTransformationFilter } from 'src/common/filters/HttpExceptionFilter.filter';

@UseFilters(HttpExceptionTransformationFilter)
@UsePipes(new ValidationPipe())
@UseInterceptors(ClassSerializerInterceptor)
@WebSocketGateway({ namespace: 'matchmaking' })
export class MatchmakingGateway {
  constructor(
    private readonly logger: Logger,
    private readonly matchmakingService: MatchmakingService,
    private readonly usersService: UsersService,
  ) {}

  @SubscribeMessage('join_queue')
  async joinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() joinQueueDto: JoinQueueDto,
  ): Promise<void> {
    const user = await this.usersService.getById(client.data.id);
    if (!user) return;
    this.matchmakingService.join(user, joinQueueDto.game_mode);
    this.logger.log(
      `'${user.id}' (${user.name}) has joined queue for game mode '${joinQueueDto.game_mode}'`,
    );
  }

  @SubscribeMessage('leave_queue')
  async leaveQueue(@ConnectedSocket() client: Socket): Promise<void> {
    const user = await this.usersService.getById(client.data.id);
    if (!user) return;
    this.matchmakingService.leave(user);
    this.logger.log(`'${user.id}' (${user.name}) has left queue`);
  }
}
