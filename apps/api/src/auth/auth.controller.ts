import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AddUserDto } from 'src/users/add-user.dto';
import { CurrentUser } from 'src/users/current-user.decorator';
import { User } from 'src/users/user.entity';
import { AccessTokenResponse, SessionRequest } from 'types';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth-guard';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('register')
  async register(@Body() body: AddUserDto): Promise<AddUserDto> {
    const user = await this.authService.createUser(
      body.name,
      body.email,
      body.password,
    );
    return user;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: SessionRequest): Promise<AccessTokenResponse> {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/whoami')
  whoami(@CurrentUser() currentUser: User)
  {
    return (currentUser);
  }
}
