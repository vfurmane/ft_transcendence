import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PongGateway } from './pong.gateway';
import { PongService } from './pong.service';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [PongService, PongGateway],
})
export class PongModule {}