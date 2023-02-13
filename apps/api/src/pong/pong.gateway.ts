import { Server, Socket } from 'socket.io';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  ConnectedSocket,
  WebSocketServer,
  MessageBody,
} from '@nestjs/websockets';
import {
  ClassSerializerInterceptor,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Game } from './game.service';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { User, Userfront } from 'types';
import { Repository } from 'typeorm';
import { isUUIDDto } from 'src/conversations/dtos/IsUUID.dto';
import { TransformUserService } from 'src/TransformUser/TransformUser.service';
import { SubscribedGameDto } from './subscribed-game.dto';

@UsePipes(new ValidationPipe())
@UseInterceptors(ClassSerializerInterceptor)
@WebSocketGateway({ namespace: 'pong' })
export class PongGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  room_id!: string[];

  games!: Map<string, [Game, Array<{ id: string; ready: boolean }>]>;

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly transformUserService: TransformUserService,
  ) {
    this.room_id = [];
    this.games = new Map();
  }

  async handleConnection(client: Socket): Promise<void | string> {
    console.log('SOMEBODY IS TRYING TO CONNECT');
    const currentUser = this.authService.verifyUserFromToken(
      client.handshake.auth.token,
    );
    if (!currentUser) {
      client.disconnect();
      console.log('no Authorization');
      return;
    }
    client.data = {
      id: currentUser.sub,
      name: currentUser.name,
      room: undefined,
      position: -1,
    };
    client.join(`user_${currentUser.sub}`);
    console.log('NEW CONNECTION!');
    console.log('YOU ARE ' + currentUser.name + ' OF ID ' + client.data.id);
    if (this.games) {
      this.games.forEach((value, key) => {
        value[1].forEach((user) => {
          if (user.id === client.data.id) {
            client.data.room = key;
            client.data.position = value[1].indexOf(user);
            client.join(key);
            console.log('Reconnected to the game !');
            return 'Connection restored';
          }
        });
      });
    }
    return 'Connection established';
  }

  async handleDisconnect(client: Socket): Promise<void> {
    if (!client.data.room) {
      console.log(client.data.name + ' WAS NOT IN A ROOM');
      return;
    }
    if (!this.room_id.includes(client.data.room)) {
      console.log(client.data.name + ' IS CURRENTLY GAMING');
      return;
    }
    client.leave(client.data.room);
    console.log(client.data.name + ' LEFT WAITING ROOM');
    const socketWaiting = await this.server.in(client.data.room).fetchSockets();
    if (socketWaiting.length === 0) {
      this.room_id.splice(this.room_id.indexOf(client.data.room), 1);
      console.log('REMOVED THE ROOM');
      console.log(this.room_id);
    } else {
      let i = 0;
      socketWaiting.forEach((socket) => (socket.data.position = i++));
    }
    console.log(client.data.name + ' DISCONNECTED');
  }

  @Interval(17)
  update(): void {
    if (!this.games || this.games === undefined) {
      return;
    }
    this.games.forEach(async (key, room) => {
      const game = key[0];
      if (game.boardType !== 0) {
        game.updateGame();
      } else {
        console.log('GAME ENDED');
        const sockets = await this.server.in(room).fetchSockets();
        this.server.in(room).emit('endGame');
        sockets.forEach((socket) => {
          socket.leave(room);
          socket.data.room = undefined;
        });
        this.games.delete(room);
      }
    });
  }

  @SubscribeMessage('ready')
  async clientIsReady(
    @ConnectedSocket() client: Socket,
  ): Promise<void | string> {
    const room = client.data.room;
    if (!this.checkUser(client, room)) {
      return 'You are not allowed to send this kind of message !';
    }
    const game = this.games.get(room);
    if (!game || !game[0]) {
      return 'Game is not launched';
    }
    game[1].forEach((user) => {
      if (client.data.id === user.id) {
        user.ready = true;
        for (let i = 0; i < game[1].length; i++) {
          if (game[1][i].ready === false) {
            return;
          }
        }
        console.log('LAUNCHING GAME AT ', Date.now());
        game[0].init();
        game[0].await = false;
        this.server.in(room).emit('refresh', game[0].getState(), Date.now());
      }
    });
  }

  /*    THIS FUNCTION IS DEBUG ONLY (SHOW SERVER SIDE VISION OF THE GAME)    */
  @Interval(10)
  refresh() {
    if (!this.games || this.games === undefined) {
      return;
    }
    this.games.forEach(async (key, room) => {
      const game = key[0];
      if (!game.await && game.boardType !== 0) {
        const state = game.getState();
        this.server.in(room).emit('refresh', state, Date.now());
      }
    });
  }

  checkUser(client: Socket, room: undefined | string): boolean {
    if (room === undefined) {
      // not in any room
      console.log('no room');
      return false;
    } else if (client.data.position === -1) {
      // is not a player (spectate)
      console.log('no position : ' + client.data.position);
      return false;
    }
    return true;
  }

  @SubscribeMessage('up')
  async registerUp(@ConnectedSocket() client: Socket): Promise<void | string> {
    const room = client.data.room;
    if (!this.checkUser(client, room)) {
      return 'You are not allowed to send this kind of message !';
    }
    const game = this.games.get(room)![0];
    if (!game) {
      return 'Game not launched';
    }
    game.movePlayer(client.data.position, true);
    this.server.in(room).emit('refresh', game.getState(), Date.now());
    return 'You moved up';
  }

  @SubscribeMessage('down')
  async registerDown(
    @ConnectedSocket() client: Socket,
  ): Promise<void | string> {
    const room = client.data.room;
    if (!this.checkUser(client, room)) {
      return 'You are not allowed to send this kind of message !';
    }
    const game = this.games.get(room)![0];
    if (!game) {
      return 'Game not launched';
    }
    game.movePlayer(client.data.position, false);
    this.server.in(room).emit('refresh', game.getState(), Date.now());
    return 'You moved down ';
  }

  @SubscribeMessage('startGame')
  async startGame(@ConnectedSocket() client: Socket): Promise<void | string> {
    const room = client.data.room;
    if (room === undefined) return 'You are not in a room';
    if (this.room_id.indexOf(room) === -1) {
      client.data.room = undefined;
      return 'Your room doesnt exist !';
    }
    if (client.data.position === 0) {
      const numberPlayer = (await this.server.in(room).fetchSockets()).length;
      const fetchSockets = await this.server.in(room).fetchSockets();
      const ids = fetchSockets.map((e) => e.data.id);
      const users = await this.userRepository
        ?.createQueryBuilder()
        .where('id IN (:...ids)', {
          ids: ids,
        })
        .getMany();
      const ListOfPlayers = await Promise.all(
        users.map(
          async (e: User): Promise<Userfront> =>
            await this.transformUserService.transform(e),
        ),
      );
      //console.log(ListOfPlayers);
      const list: Array<{ id: string; ready: boolean }> = [];
      (await this.server.in(room).fetchSockets()).forEach((element) => {
        list.push({ id: element.data.id, ready: false });
        this.server.in(`user_${element.data.id}`).emit('startGame', {
          listOfPlayers: ListOfPlayers,
          number_player: numberPlayer,
          position: element.data.position,
        });
      });
      this.games.set(room, [
        new Game(numberPlayer, this.server.in(room)),
        list,
      ]);
      return 'Launching the game for room ' + room;
    }
    return 'You are not player 1 !';
  }

  @SubscribeMessage('searchGame')
  async searchGame(@ConnectedSocket() client: Socket): Promise<void | string> {
    console.log('SOMEBODY IS SEARCHING FOR A GAME');
    const clientSockets = await this.server
      .in(`user_${client.data.id}`)
      .fetchSockets();
    console.log(`YOU HAVE ${clientSockets.length} SOCKETS OPEN MY FRIEND`);
    const connectedSockets = clientSockets.filter(
      (socket) => socket.data.room !== undefined,
    );
    if (connectedSockets.length) return 'You are already in a room !';
    if (this.room_id?.length) {
      for (const room of this.room_id) {
        const count = (await this.server.in(room).fetchSockets()).length;
        if (count < 2) {
          client.join(room);
          client.data.room = room;
          client.data.position = count;
          console.log(count);
          if (count === 1) {
            // CHANGE BACK TO 5 PLEASE
            const list: Array<{ id: string; ready: boolean }> = [];
            const fetchSockets = await this.server.in(room).fetchSockets();
            const ids = fetchSockets.map((e) => e.data.id);
            const users = await this.userRepository
              ?.createQueryBuilder()
              .where('id IN (:...ids)', {
                ids: ids,
              })
              .getMany();
            const ListOfPlayers = await Promise.all(
              users.map(
                async (e: User): Promise<Userfront> =>
                  await this.transformUserService.transform(e),
              ),
            );
            //console.log(ListOfPlayers);

            (await this.server.in(room).fetchSockets()).forEach((element) => {
              list.push({ id: element.data.id, ready: false });
              this.server.in(`user_${element.data.id}`).emit('startGame', {
                listOfPlayers: ListOfPlayers,
                number_player: count + 1,
                position: element.data.position,
              });
            });
            this.games.set(room, [new Game(2, this.server.in(room)), list]);
            this.room_id.splice(this.room_id.indexOf(room), 1); // pop the room out of the list
            return 'Launched game for room ' + room;
          }
          return 'Joined room of id ' + room + ' at position ' + count;
        }
      }
      const num = (Number(this.room_id.at(-1)) + 1).toString(); // change to a random URI
      this.room_id.push(num);
      client.join(num);
      client.data.room = num;
      client.data.position = 0;
      return 'Created room of id ' + num;
    }
    this.room_id = ['0'];
    client.join('0');
    client.data.room = '0';
    client.data.position = 0;
    return 'Created the first ever room !';
  }
}
