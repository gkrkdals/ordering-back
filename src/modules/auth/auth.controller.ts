import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { Response } from "express";
import { access } from "fs";

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() signInDto: Record<string, any>,
    @Res({ passthrough: true }) res: Response
  ) {
    const token = await this.authService.signIn(signInDto.id);
    res.setHeader("Authorization", `Bearer ${token.access_token}`)

    return { accessToken: token.access_token }
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}