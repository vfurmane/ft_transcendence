import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import * as speakeasy from 'speakeasy';
import { AccessTokenResponse, FtUser, JwtPayload, State, User } from 'types';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from 'src/users/register-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { State as StateEntity } from './state.entity';
import { User as UserEntity } from '../users/user.entity';
import { Jwt as JwtEntity } from './jwt.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(StateEntity)
    private readonly statesRepository: Repository<StateEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(JwtEntity)
    private readonly jwtsRepository: Repository<JwtEntity>,
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async fetchProfileWithToken(accessToken: string): Promise<FtUser> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<FtUser>('https://api.intra.42.fr/v2/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response?.data) this.logger.error(error.response?.data);
            return throwError(
              () =>
                "An error occured while fetching the user's profile using its access token.",
            );
          }),
        ),
    );
    return data;
  }

  async createUser(user: RegisterUserDto): Promise<User> {
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(user.password, salt);
    return this.usersService.addUser(user);
  }

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.getByEmail(email);
    if (
      user &&
      user?.password !== null &&
      (await bcrypt.compare(pass, user.password))
    ) {
      return user;
    }
    return null;
  }

  async validateJwt(
    user: UserEntity,
    payload: JwtPayload,
  ): Promise<UserEntity | null> {
    //Check if jwt exist in db (in case of revocation)
    const jwt = await this.jwtsRepository.findOneBy({ id: payload.jti });
    if (!jwt) return null;

    return user;
  }

  async login(user: UserEntity): Promise<AccessTokenResponse> {
    const jwtEntity = new JwtEntity();
    jwtEntity.user = user;
    await this.jwtsRepository.save(jwtEntity).then((jwt) => {
      jwtEntity.id = jwt.id;
    });

    const payload: JwtPayload = {
      sub: user.id,
      name: user.name,
      jti: jwtEntity.id,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getRequestState(stateToken: string, user: User): Promise<State> {
    if (!stateToken) throw 'State parameter is needed.';

    let state = await this.statesRepository.findOneBy({
      token: stateToken,
    });
    if (state === null) {
      state = new StateEntity();
      state.token = stateToken;
      if (user)
        state.user = await this.usersRepository.findOneBy({
          id: user.id,
        });
      await this.statesRepository.save(state);
    }
    return state;
  }

  async checkTfa(user: User, token: string): Promise<boolean> {
    if (user.tfa_secret === null)
      throw new BadRequestException('TFA not setup yet');

    // Check the token
    const tokenValidates = speakeasy.totp.verify({
      secret: user.tfa_secret,
      encoding: 'base32',
      token: token,
      window: 1,
    });
    if (!tokenValidates) throw new BadRequestException('OTP token is invalid');

    // Finish token setup (if not already)
    if (!user.tfa_setup) {
      this.usersService.validateTfa(user.id);
    }
    return true;
  }

  async removeState(state: State): Promise<void> {
    state;
    return;
  }
}
