import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AddUserDto } from 'src/users/add-user.dto';
import { AccessTokenResponse, User } from 'types';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async createUser(
    username: string,
    email: string,
    pass: string,
  ): Promise<AddUserDto> {
    const salt = await bcrypt.genSalt();
    const user = {
      name: username,
      password: await bcrypt.hash(pass, salt),
      email: email,
    };
    this.userService.addUser(user);
    return user;
  }

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.userService.getByEmail(email);
    if (!user || user.password === null) return null;
    if (await bcrypt.compare(pass, user.password)) {
      return user;
    }
    return null;
  }

  async login(user: User): Promise<AccessTokenResponse> {
    const payload = { username: user.name, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
