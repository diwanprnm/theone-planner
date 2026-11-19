import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, RequestUser } from '../guards/authenticated-request';

/**
 * Mengambil Pengguna yang sedang masuk dari request.
 *
 *   findAll(@CurrentUser() user: RequestUser) { ... }
 *   findAll(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return field ? request.user[field] : request.user;
  },
);
