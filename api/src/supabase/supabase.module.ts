import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * Global supaya modul lain (mis. Pengeluaran yang membersihkan struk) tidak
 * perlu mengimpor modul ini satu per satu.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
