import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SessionRequest, User } from 'types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    readonly logger: Logger,
  ) {}

  @UseGuards(JwtAuthGuard)
  //Choose an interceptor (which data to exclude)
  @Get()
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

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
}
