import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AddUserDto } from 'src/users/add-user.dto';
import { AccessTokenResponse, SessionRequest } from 'types';
import { AuthService } from './auth.service';
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
}
