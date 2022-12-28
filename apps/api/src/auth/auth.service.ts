import { Injectable } from '@nestjs/common';
import { AddUserDto } from 'src/users/add-user.dto';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private userService: UsersService) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.getByEmail(email);
    if (user && await bcrypt.compare(pass, user.password || '')) {
      const { password, ...result} = user;
      return result;
    }
    return null;
  }
}
