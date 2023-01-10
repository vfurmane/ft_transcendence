import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AccessTokenResponse, SessionRequest, User } from 'types';
import { ChangeUserPasswordDto } from './change-user-password.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    readonly logger: Logger,
  ) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('profile')
  async getProfile(@Request() req: SessionRequest): Promise<User> {
    if (!req.user) {
      this.logger.error(
        'This is the impossible type error where the user is authenticated but the `req.user` is `undefined`',
      );
      throw new InternalServerErrorException('Unexpected error');
    }
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change_user_password')
  async changeUserPassword(
    @Request() req: SessionRequest,
    @Body() changeUserPasswordDto: ChangeUserPasswordDto,
  ): Promise<AccessTokenResponse> {
    if (!req.user) {
      this.logger.error(
        'This is the impossible type error where the user is authenticated but the `req.user` is `undefined`',
      );
      throw new InternalServerErrorException('Unexpected error');
    }
    return this.usersService.changeUserPassword(
      req.user,
      changeUserPasswordDto,
    );
  }
}
