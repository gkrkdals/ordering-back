import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Customer } from "@src/entities/customer.entity";

export const User = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as Customer;
  }
)