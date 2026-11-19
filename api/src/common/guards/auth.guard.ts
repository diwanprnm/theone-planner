import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AuthenticatedRequest } from './authenticated-request';

/**
 * Memverifikasi `Authorization: Bearer <token>` lewat Supabase Auth, lalu
 * memastikan baris Pengguna ada di database kita (dibuat sekali saat pertama
 * kali token ini terlihat).
 *
 * Hasilnya ditempelkan ke `request.user`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Header Authorization tidak ada atau tidak berformat Bearer');
    }

    const supabaseUser = await this.supabase.getUserFromToken(token);

    // Pastikan Pengguna tercatat. Dipanggil tiap request; biayanya satu upsert
    // yang biasanya tidak menulis apa-apa karena email sudah sama.
    const user = await this.prisma.user.upsert({
      where: { id: supabaseUser.id },
      update: {},
      create: {
        id: supabaseUser.id,
        email: supabaseUser.email ?? `${supabaseUser.id}@tanpa-email.local`,
        name: (supabaseUser.user_metadata?.full_name as string | undefined) ?? null,
      },
      select: { id: true, email: true, name: true },
    });

    request.user = user;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim() || null;
}
