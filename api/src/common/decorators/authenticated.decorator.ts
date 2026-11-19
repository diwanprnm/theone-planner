import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';

/**
 * Menandai route sebagai butuh autentikasi: memasang AuthGuard sekaligus
 * mendokumentasikan skema Bearer di Swagger.
 */
export function Authenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Token tidak ada, tidak valid, atau kedaluwarsa' }),
  );
}
