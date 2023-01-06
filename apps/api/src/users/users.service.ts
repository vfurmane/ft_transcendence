import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'types';
import { AddUserDto } from './add-user.dto';
import { User as UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async getByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOneBy({
      email,
    });
  }

  async getById(id: string): Promise<UserEntity | null> {
    let user =  await this.usersRepository.findOneBy({
      id,
    });
    if (!user)
      throw new NotFoundException()
    return user
  }

  async addUser(user: AddUserDto): Promise<User> {
    const userEntity = new UserEntity();
    userEntity.email = user.email;
    userEntity.name = user.name;
    userEntity.password = user.password;
    return this.usersRepository.save(userEntity);
  }
}
