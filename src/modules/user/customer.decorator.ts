import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtCustomer } from "@src/types/jwt/JwtCustomer";
import { JwtUser } from "@src/types/jwt/JwtUser";

export const CustomerData = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtCustomer;
  }
)

export const UserData = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUser;
  }
)