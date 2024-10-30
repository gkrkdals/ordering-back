import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post, Put,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CookieOptions, Request, Response } from "express";
import { Customer } from "@src/entities/customer.entity";
import { ManagerSignInDto } from "@src/modules/auth/dto/manager-sign-in.dto";
import { CreateAccountDto } from "@src/modules/auth/dto/create-account.dto";
import { CustomerData } from "@src/modules/user/customer.decorator";
import { User } from "@src/entities/user.entity";

const cookieOptions: CookieOptions = {
  sameSite: "none",
  httpOnly: true,
  secure: true,
  maxAge: 1000 * 60 * 60 * 24 * 7
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() signInDto: Record<string, any>,
    @Res({ passthrough: true }) res: Response
  ): Promise<Customer> {
    const data = await this.authService.clientSignIn(signInDto.id);
    res.setHeader("Authorization", `Bearer ${data.access_token}`)
    res.cookie("jwt", data.access_token, cookieOptions);

    return data.payload
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@CustomerData() customer: Customer, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.clientSignIn(customer.id);
    res.setHeader("Authorization", `Bearer ${data.access_token}`)
    res.cookie("jwt", data.access_token, cookieOptions);

    return data.payload
  }

  @HttpCode(HttpStatus.OK)
  @Post('manager/signin')
  async managerSignIn(
    @Body() signInDto: ManagerSignInDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const data = await this.authService.managerSignIn(signInDto);
    res.setHeader("Authorization", `Bearer ${data.access_token}`);
    res.cookie("jwt", data.access_token, cookieOptions);

    return { jwt: data.access_token, payload: data.payload };
  }

  @HttpCode(HttpStatus.OK)
  @Post('manager/app/signin')
  async managerAppSignIn(
    @Body('jwt') jwt: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const data = await this.authService.managerAppSignIn(jwt);
    res.setHeader("Authorization", `Bearer ${data.access_token}`);
    res.cookie("jwt", data.access_token, cookieOptions);

    return data.payload;
  }

  @Get('manager/logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(res, req['user']);
  }

  @Get('manager/profile')
  @UseGuards(AuthGuard)
  getManagerProfile(
    @Req() req: any,
    @Query('permission') permission: 'manager' | 'rider' | 'cook' | undefined
  ) {
    return this.authService.checkProfile(req, permission);
  }

  @UseGuards(AuthGuard)
  @Get('account')
  async getAccounts() {
    return this.authService.getAccounts();
  }

  @UseGuards(AuthGuard)
  @Post('account')
  async createAccount(@Body() body: CreateAccountDto) {
    await this.authService.createAccount(body);
  }

  @UseGuards(AuthGuard)
  @Put('account')
  async updateAccount(@Body('user') account: User) {
    await this.authService.updateAccount(account);
  }

  @UseGuards(AuthGuard)
  @Delete('account/:id')
  async deleteAccount(@Param('id') id: number) {
    await this.authService.deleteAccount(id);
  }
}