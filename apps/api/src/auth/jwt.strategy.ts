import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';
import { JwtPayload, User } from 'types';
import { AuthService } from './auth.service';
import { Jwt as JwtEntity } from './jwt.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    protected readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    @InjectRepository(JwtEntity)
    private readonly jwtsRepository: Repository<JwtEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User | null> {
    const user = await this.usersService.getById(payload.sub);
    if (user === null) return null;

    return await this.authService.validateJwt(user, payload);
  }
}
