import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Customer } from "@src/entities/customer.entity";
import { User } from "@src/entities/user.entity";

export const CustomerData = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as Customer;
  }
)

export const UserData = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as User;
  }
)