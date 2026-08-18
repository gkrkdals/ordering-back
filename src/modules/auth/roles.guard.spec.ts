import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "@src/modules/auth/roles.guard";
import { PermissionEnum } from "@src/types/enum/PermissionEnum";

describe('RolesGuard', () => {
  function createContext(user: any): ExecutionContext {
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  function createGuard(roles: string[] | undefined): RolesGuard {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(roles),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('Roles 미지정 라우트는 통과시킨다', () => {
    const guard = createGuard(undefined);
    expect(guard.canActivate(createContext({ id: 1 }))).toBe(true);
  });

  it('Roles([])는 인증만 요구하고 통과시킨다', () => {
    const guard = createGuard([]);
    expect(guard.canActivate(createContext({ id: 1 }))).toBe(true);
  });

  it('permission이 없는 고객 JWT는 직원 라우트에서 차단된다', () => {
    const guard = createGuard(['manager', 'rider', 'cook']);
    expect(() => guard.canActivate(createContext({ id: 1, name: '고객' })))
      .toThrow(ForbiddenException);
  });

  it('manager 권한은 manager 라우트를 통과한다', () => {
    const guard = createGuard(['manager']);
    expect(guard.canActivate(createContext({ id: 1, permission: PermissionEnum.Manager }))).toBe(true);
  });

  it('rider 권한은 manager 전용 라우트에서 차단된다', () => {
    const guard = createGuard(['manager']);
    expect(() => guard.canActivate(createContext({ id: 1, permission: PermissionEnum.Rider })))
      .toThrow(ForbiddenException);
  });

  it('rider 권한은 공용 직원 라우트를 통과한다', () => {
    const guard = createGuard(['manager', 'rider', 'cook']);
    expect(guard.canActivate(createContext({ id: 1, permission: PermissionEnum.Rider }))).toBe(true);
  });
});
