import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "@src/modules/user/user.service";
import { Customer } from "@src/entities/customer.entity";
import { JwtService } from "@nestjs/jwt";
import { classToObject } from "@src/utils/data";
import { User } from "@src/entities/user.entity";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";
import { CreateAccountDto } from "@src/modules/auth/dto/create-account.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

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

  async managerSignIn(
    username: string,
    password: string
  ): Promise<{ access_token: string; payload: User; }> {
    const user = await this.usersService.findUser(username, password);
    if (!user) {
      throw new BadRequestException();
    }

    const payload = classToObject(user);
    delete payload.password;

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
}