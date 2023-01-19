import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { FriendshipsModule  } from './friendships/friendships.module';
<<<<<<< HEAD
import { ConversationsModule } from './conversations/conversations.module';
=======
import { MatchModule } from './Match/Match.module';
import { LeaderBoardModule } from './leaderBoard/leaderBoard.module';
>>>>>>> 6a17e2e (game data first commit)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: 5432,
        username: configService.get('POSTGRES_USERNAME'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DATABASE'),
        autoLoadEntities: true,
        // TODO check NODE_ENV
        //
        // From NestJS docs:
        // Setting `synchronize: true` shouldn't be used in production - otherwise you can lose production data.
        synchronize: true,
      }),
    }),
    UsersModule,
    AuthModule,
    SearchModule,
    FriendshipsModule,
    UsersModule,
<<<<<<< HEAD
    ConversationsModule,
=======
    MatchModule,
    LeaderBoardModule
>>>>>>> 6a17e2e (game data first commit)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
