import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { Response } from "express";
import { Customer } from "@src/entities/customer.entity";
import { ManagerSignInDto } from "@src/modules/auth/dto/manager-sign-in.dto";
import { CreateAccountDto } from "@src/modules/auth/dto/create-account.dto";
import { CustomerData } from "@src/modules/user/customer.decorator";

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
    res.cookie("jwt", data.access_token, { httpOnly: true });

    return data.payload
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@CustomerData() customer: Customer, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.clientSignIn(customer.id);
    res.setHeader("Authorization", `Bearer ${data.access_token}`)
    res.cookie("jwt", data.access_token, { httpOnly: true });

    return data.payload
  }

  @HttpCode(HttpStatus.OK)
  @Post('manager/signin')
  async managerSignIn(
    @Body() signInDto: ManagerSignInDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { username, password } = signInDto;
    const token = await this.authService.managerSignIn(username, password);
    res.setHeader("Authorization", `Bearer ${token.access_token}`);
    res.cookie("jwt", token.access_token, { httpOnly: true });

    return token.payload;
  }

  @Get('manager/logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt');
  }

  @UseGuards(AuthGuard)
  @Get('manager/profile')
  getManagerProfile(
    @Req() req: any,
    @Query('permission') permission: 'manager' | 'rider' | 'cook' | undefined
  ) {
    return this.authService.checkProfile(req, permission);
  }

  @UseGuards(AuthGuard)
  @Post('account')
  async createAccount(@Body() body: CreateAccountDto) {
    await this.authService.createAccount(body);
  }
}