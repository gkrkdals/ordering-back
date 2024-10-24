import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "@src/modules/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { classToObject } from "@src/utils/data";
import { User } from "@src/entities/user.entity";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";
import { CreateAccountDto } from "@src/modules/auth/dto/create-account.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "@src/entities/customer.entity";
import { ManagerSignInDto } from "@src/modules/auth/dto/manager-sign-in.dto";
import { Response } from "express";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
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
      access_token: await this.jwtService.signAsync(payload),
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
    }

    const payload = classToObject(user);
    delete payload.password;
    delete payload.fcmToken;

    const saved = await this.userRepository.save(user);
    console.log(saved.fcmToken);

    return {
      access_token: await this.jwtService.signAsync(payload),
      payload,
    }
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

  async createAccount(body: CreateAccountDto) {
    const { username, password, nickname, permission } = body;
    const newUser = new User();
    newUser.username = username;
    newUser.password = password;
    newUser.nickname = nickname;
    newUser.permission = permission;
    await this.userRepository.save(newUser);
  }

  async logout(res: Response, user: User) {
    res.clearCookie('jwt', { secure: true, httpOnly: true, sameSite: "none" });
    if (user && user.id) {
      const foundUser = await this.userRepository.findOneBy({ id: user.id });
      foundUser.fcmToken = null;
      await this.userRepository.save(foundUser);
    }
  }
}