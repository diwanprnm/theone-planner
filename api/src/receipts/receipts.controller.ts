import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../common/decorators/authenticated.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReceiptsService, type UploadedReceiptFile } from './receipts.service';

/** Batas ukuran foto struk — cukup untuk foto ponsel, tidak untuk video. */
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

@ApiTags('Struk')
@Authenticated()
@Controller()
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Post('expenses/:id/receipt')
  @ApiOperation({ summary: 'Unggah foto struk untuk sebuah pengeluaran' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_RECEIPT_BYTES, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (!ALLOWED_RECEIPT_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Foto struk harus berupa gambar (JPG, PNG, WEBP, atau HEIC)'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: UploadedReceiptFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Berkas foto struk tidak ditemukan pada permintaan');
    }

    return this.receipts.upload(userId, id, file);
  }

  @Get('expenses/:id/receipt')
  @ApiOperation({ summary: 'URL bertanda tangan untuk membaca foto struk' })
  signedUrl(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.receipts.signedUrl(userId, id);
  }

  @Delete('expenses/:id/receipt')
  @HttpCode(204)
  @ApiOperation({ summary: 'Hapus foto struk dari sebuah pengeluaran' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.receipts.remove(userId, id);
  }
}
