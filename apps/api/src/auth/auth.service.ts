import { Injectable } from '@nestjs/common';
import { AddUserDto } from 'src/users/add-user.dto';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService
  ) {}

  async createUser(username: string, email: string, pass: string): Promise<any> {
    const user = new AddUserDto;
    const salt = await bcrypt.genSalt();
    user.name = username;
    user.password = await bcrypt.hash(pass, salt);
    user.email = email;
    this.userService.addUser(user);
    const { password, ...resut} = user;
    return resut;
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.getByEmail(email);
    if (!user || user.password === null) return null;
    if (await bcrypt.compare(pass, user.password)) {
      const { password, ...result} = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.name, sub: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    }
  }
}
