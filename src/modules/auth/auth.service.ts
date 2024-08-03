import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "@src/modules/users/users.service";
import { Customer } from "@src/entities/customer.entity";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(id: number): Promise<{ access_token: string; }> {
    const customer = await this.usersService.findCustomer(id);
    if (!customer) {
      throw new UnauthorizedException();
    }

    const payload = customer;

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}