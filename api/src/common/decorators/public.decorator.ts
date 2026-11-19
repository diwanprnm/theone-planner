import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Menandai route yang tidak butuh autentikasi.
 * Dipakai bersama AuthGuard global (bila kelak dipasang sebagai APP_GUARD).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
