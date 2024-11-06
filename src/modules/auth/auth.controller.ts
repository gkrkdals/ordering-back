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
import { AuthService } from "./services/auth.service";
import { AuthGuard } from "./auth.guard";
import { CookieOptions, Response } from "express";
import { Customer } from "@src/entities/customer.entity";
import { ManagerSignInDto } from "@src/modules/auth/dto/manager-sign-in.dto";
import { CreateAccountDto } from "@src/modules/auth/dto/create-account.dto";
import { CustomerData, UserData } from "@src/modules/user/customer.decorator";
import { User } from "@src/entities/user.entity";
import { AccountService } from "@src/modules/auth/services/account.service";

const cookieOptions: CookieOptions = {
  sameSite: "none",
  httpOnly: true,
  secure: true,
  maxAge: 1000 * 60 * 60 * 24 * 7
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountService: AccountService
  ) {}

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
    @Body('token') token: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const data = await this.authService.managerAppSignIn(jwt, token);
    res.setHeader("Authorization", `Bearer ${data.access_token}`);
    res.cookie("jwt", data.access_token, cookieOptions);

    return data.payload;
  }

  @Get('manager/logout')
  @UseGuards(AuthGuard)
  async logout(@Res() res: Response, @UserData() user: User, @Query('isNative') isNative: boolean) {
    await this.authService.logout(res, user, isNative);
  }

  @Get('manager/profile')
  @UseGuards(AuthGuard)
  getManagerProfile(
    @Req() req: any,
    @Query('permission') permission: 'manager' | 'rider' | 'cook' | undefined
  ) {
    return this.authService.checkProfile(req, permission);
  }

  @HttpCode(HttpStatus.OK)
  @Post('manager/fcm')
  @UseGuards(AuthGuard)
  async refreshToken(@UserData() user: User, @Body('token') token: string) {
    await this.authService.refreshToken(user, token);
  }

  @UseGuards(AuthGuard)
  @Get('account')
  async getAccounts() {
    return this.accountService.getAccounts();
  }

  @UseGuards(AuthGuard)
  @Post('account')
  async createAccount(@Body() body: CreateAccountDto) {
    await this.accountService.createAccount(body);
  }

  @UseGuards(AuthGuard)
  @Put('account')
  async updateAccount(@Body('user') account: User) {
    await this.accountService.updateAccount(account);
  }

  @UseGuards(AuthGuard)
  @Delete('account/:id')
  async deleteAccount(@Param('id') id: number) {
    await this.accountService.deleteAccount(id);
  }
}