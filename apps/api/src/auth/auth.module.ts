import { HttpModule } from '@nestjs/axios';
import { forwardRef, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FtOauth2Strategy } from './ft-oauth2.strategy';
import { JwtStrategy } from './jwt.strategy';
import { State } from 'types';
import ftOauth2Configuration from '../config/ft-oauth2';
import { LocalStrategy } from './local.strategy';
import { TransformUserService } from 'src/TransformUser/TransformUser.service';
import { Jwt } from 'types';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [ftOauth2Configuration],
    }),
    HttpModule,
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    PassportModule,
    TypeOrmModule.forFeature([State, Jwt]),
    forwardRef(() => UsersModule),
  ],
  providers: [
    AuthService,
    FtOauth2Strategy,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    Logger,
    UsersService,
    TransformUserService,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
