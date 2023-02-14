import { Logger, Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { PongGateway } from './pong.gateway';
import { PongService } from './pong.service';
import { TransformUserModule } from 'src/TransformUser/TransformUser.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game, Opponent } from 'types';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TransformUserModule,
    TypeOrmModule.forFeature([Opponent, Game]),
  ],
  controllers: [],
  providers: [Logger, PongService, PongGateway],
  exports: [PongService],
})
export class PongModule {}
