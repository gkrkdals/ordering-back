import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "@src/modules/user/user.service";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { classToObject } from "@src/utils/data";
import { User } from "@src/entities/user.entity";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "@src/entities/customer.entity";
import { ManagerSignInDto } from "@src/modules/auth/dto/manager-sign-in.dto";
import { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { FirebaseService } from "@src/modules/firebase/firebase.service";

const option: JwtSignOptions = {
  expiresIn: "7d"
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly fcmService: FirebaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async clientSignIn(id: number): Promise<{ access_token: string; payload: Customer; }> {
    const customer = await this.usersService.findCustomer(id);

    if (!customer) {
      throw new UnauthorizedException();
    }

    const payload = classToObject(customer);

    return {
      access_token: await this.jwtService.signAsync(payload, option),
      payload: customer,
    };
  }

  async managerSignIn(signInDto: ManagerSignInDto): Promise<{ access_token: string; payload: any; }> {
    const user = await this.usersService.findUser(signInDto.username, signInDto.password);

    if (!user) {
      throw new BadRequestException();
    }

    if (signInDto.token) {
      user.fcmToken = signInDto.token;
      await this.userRepository.save(user);
      await this.subscribe(user, signInDto.token);
    }

    const payload = classToObject(user);
    delete payload.password;
    delete payload.fcmToken;

    return {
      access_token: await this.jwtService.signAsync(payload, option),
      payload,
    }
  }

  async managerAppSignIn(jwt: string) {
    const data = await this.jwtService.verifyAsync<User>(jwt, { secret: this.configService.get('JWT_SECRET') });
    return { access_token: jwt, payload: data };
  }

  checkProfile(req: any, permission: 'manager' | 'rider' | 'cook' | undefined) {
    const user: User = req.user;

    switch (permission) {
      case undefined:
        return user;

      case 'manager':
        if (user.permission !== PermissionEnum.Manager) {
          throw new UnauthorizedException();
        }
        break;

      case 'rider':
        if (user.permission !== PermissionEnum.Rider) {
          throw new UnauthorizedException();
        }
        break;

      case 'cook':
        if (user.permission !== PermissionEnum.Cook) {
          throw new UnauthorizedException();
        }
        break;

      default:
        throw new UnauthorizedException();
    }

    return user;
  }

  async refreshToken(user: User, newToken: string) {
    if (user && user.id) {
      const foundUser = await this.userRepository.findOneBy({ id: user.id });

      foundUser.fcmToken = newToken;

    }
  }

  async logout(res: Response, user: User, isNative: boolean) {
    res.clearCookie('jwt', { secure: true, httpOnly: true, sameSite: "none" });
    res.status(200).send();
    if (user && user.id && isNative) {
      const foundUser = await this.userRepository.findOneBy({ id: user.id });
      if (foundUser.fcmToken) {
        await this.unsubscribe(foundUser, foundUser.fcmToken);
      }

      foundUser.fcmToken = null;
      await this.userRepository.save(foundUser);
    }
  }

  private async subscribe(user: User, token: string) {
    await this.fcmService.subscribeToTopic(token, "all");
    if (user.permission === PermissionEnum.Cook) {
      await this.fcmService.subscribeToTopic(token, "cook");
    } else {
      await this.fcmService.subscribeToTopic(token, "manager");
    }
  }

  private async unsubscribe(user: User, token: string) {
    await this.fcmService.unsubscribeFromTopic(token, "all");
    if (user.permission === PermissionEnum.Cook) {
      await this.fcmService.unsubscribeFromTopic(token, "cook");
    } else {
      await this.fcmService.unsubscribeFromTopic(token, "manager");
    }
  }
}