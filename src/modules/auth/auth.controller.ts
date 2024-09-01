import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { Response } from "express";
import { Customer } from "@src/entities/customer.entity";

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() signInDto: Record<string, any>,
    @Res({ passthrough: true }) res: Response
  ): Promise<Customer> {
    const token = await this.authService.signIn(signInDto.id);
    res.setHeader("Authorization", `Bearer ${token.access_token}`)
    res.cookie("jwt", token.access_token, { httpOnly: true, sameSite: "none" });

    return token.payload
  }

  @UseGuards(AuthGuard)
  @Get('profile') 
  getProfile(@Request() req: any) {
    return req.user;
  }
}