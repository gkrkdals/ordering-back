import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "@src/decorators/roles.decorator";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";

const roleToPermission: Record<string, PermissionEnum> = {
  manager: PermissionEnum.Manager,
  rider: PermissionEnum.Rider,
  cook: PermissionEnum.Cook,
};

/**
 * Roles 데코레이터로 지정된 직원 권한을 검증합니다.
 * 고객 JWT에는 permission 필드가 없으므로 직원 전용 라우트에서 차단됩니다.
 * AuthGuard 이후에 실행되어야 합니다. (request.user 필요)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest()['user'];
    const permission = user?.permission;

    if (typeof permission !== 'number') {
      throw new ForbiddenException();
    }

    const allowed = roles.some(role => roleToPermission[role] === permission);
    if (!allowed) {
      throw new ForbiddenException();
    }

    return true;
  }
}
