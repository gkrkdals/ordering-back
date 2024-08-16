import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "@src/modules/user/user.service";
import { Customer } from "@src/entities/customer.entity";
import { JwtService } from "@nestjs/jwt";
import { classToObject } from "@src/utils/data";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(id: number): Promise<{ access_token: string; payload: Customer; }> {
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
}