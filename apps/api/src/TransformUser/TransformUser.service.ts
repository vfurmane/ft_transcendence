import { User } from 'types';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';

export interface Userfront {
  id: string;
  name: string;
  avatar_num: number;
  status: string;
  victory: number;
  defeat: number;
  rank: number;
  level: number;
}

@Injectable()
export class TransformUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async #getVictoryNumber(user_id: string): Promise<number> {
    const user = await this.userRepository.findOne({
      relations: {
        win: true,
      },
      where: {
        id: user_id,
      },
    });
    if (!user) throw new BadRequestException('user not found');

    return user.win.length;
  }

  async #getDefeatNumber(user_id: string): Promise<number> {
    const user = await this.userRepository.findOne({
      relations: {
        defeat: true,
      },
      where: {
        id: user_id,
      },
    });
    if (!user) throw new BadRequestException('user not found');

    return user.defeat.length;
  }

  async #getRank(user_id: string): Promise<number> {
    const users = await this.userRepository.find();
    if (!users) throw new BadRequestException('users not found');

    return (
      users
        .sort((a, b) => b.level - a.level)
        .findIndex((e) => e.id === user_id) + 1
    );
  }

  async transform(userBack: User | null): Promise<Userfront> {
    if (!userBack)
      return {
        id: '',
        name: '',
        avatar_num: 1,
        status: '',
        victory: 0,
        defeat: 0,
        rank: 0,
        level: 0,
      };
    return {
      id: userBack.id,
      name: userBack.name,
      avatar_num: Math.floor(Math.random() * 19) + 1,
      status: Math.floor(Math.random() * 1) + 1 ? 'onligne' : 'outligne',
      victory: await this.#getVictoryNumber(userBack.id),
      defeat: await this.#getDefeatNumber(userBack.id),
      rank: await this.#getRank(userBack.id),
      level: userBack.level,
    };
  }
}
