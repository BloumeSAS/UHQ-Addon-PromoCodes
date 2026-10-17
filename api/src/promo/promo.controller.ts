import {
  BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PanelAuthService } from '../auth/panel-auth.service';
import { PromoService } from './promo.service';
import { WalletClient } from './wallet.client';
import { CodeDto, GenerateDto, InternalDto, RedeemDto, ReleaseDto } from './promo.dto';

@Controller('api')
export class PromoController {
  constructor(
    private readonly promo: PromoService,
    private readonly auth: PanelAuthService,
    private readonly wallet: WalletClient,
  ) {}

  // ─── Client ──────────────────────────────────────────────────────────────────

  /** GET /api/me — historique des codes utilisés par le client + le Wallet est-il disponible ? */
  @Get('me')
  async me(@Req() req: Request) {
    const user = await this.auth.authenticate(req);
    const wallet = await this.wallet.isAvailable();
    let currency = 'EUR';
    if (wallet) {
      try {
        currency = (await this.wallet.getBalance(user.id)).currency;
      } catch {
        /* devise par défaut */
      }
    }
    return { history: this.promo.historyFor(user.id), wallet, currency };
  }

  /** POST /api/redeem — applique un code « crédit » : le solde Wallet est crédité. */
  @Post('redeem')
  @HttpCode(200)
  async redeem(@Req() req: Request, @Body() dto: RedeemDto) {
    const user = await this.auth.authenticate(req);
    return { success: true, ...(await this.promo.redeemCredit({ id: user.id, email: user.email }, dto.code)) };
  }

  // ─── Administration ──────────────────────────────────────────────────────────

  @Get('stats')
  async stats(@Req() req: Request) {
    await this.auth.requireAdmin(req);
    return this.promo.stats();
  }

  @Get('codes')
  async list(
    @Req() req: Request, @Query('q') q?: string, @Query('kind') kind?: string, @Query('status') status?: string,
    @Query('limit') limit?: string, @Query('offset') offset?: string,
  ) {
    await this.auth.requireAdmin(req);
    return this.promo.list({ q: q?.slice(0, 60), kind, status, limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined });
  }

  @Post('codes')
  @HttpCode(200)
  async create(@Req() req: Request, @Body() dto: CodeDto) {
    await this.auth.requireAdmin(req);
    return { code: this.promo.create(dto as any) };
  }

  /** POST /api/codes/generate — N codes uniques d'après un modèle (ex. codes cadeau à usage unique). */
  @Post('codes/generate')
  @HttpCode(200)
  async generate(@Req() req: Request, @Body() dto: GenerateDto) {
    await this.auth.requireAdmin(req);
    const codes = this.promo.generate(dto.template as any, dto.count, dto.prefix ?? '', dto.length ?? 8);
    return { generated: codes.length, codes: codes.map((c) => c.code) };
  }

  @Patch('codes/:id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: CodeDto) {
    await this.auth.requireAdmin(req);
    return { code: this.promo.update(id, dto as any) };
  }

  @Delete('codes/:id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    await this.auth.requireAdmin(req);
    this.promo.remove(id);
    return { success: true };
  }

  @Get('redemptions')
  async redemptions(@Req() req: Request, @Query('code_id') codeId?: string, @Query('q') q?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    await this.auth.requireAdmin(req);
    return this.promo.redemptions({ code_id: codeId, q: q?.slice(0, 60), limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined });
  }

  // ─── Appels internes (Orders / Wallet) — X-Panel-Key ────────────────────────

  /** POST /api/internal/validate — contrôle un code sans le consommer. */
  @Post('internal/validate')
  @HttpCode(200)
  internalValidate(@Headers('x-panel-key') key: string | undefined, @Body() dto: InternalDto) {
    this.auth.requirePanelKey(key);
    return this.promo.validate(dto);
  }

  /** POST /api/internal/consume — revalide puis enregistre l'utilisation (idempotent par `ref`). */
  @Post('internal/consume')
  @HttpCode(200)
  internalConsume(@Headers('x-panel-key') key: string | undefined, @Body() dto: InternalDto) {
    this.auth.requirePanelKey(key);
    if (!dto.ref) throw new BadRequestException('ref requis');
    return this.promo.consume({ ...dto, ref: dto.ref });
  }

  /** POST /api/internal/release — annule les utilisations d'une référence (commande annulée / expirée). */
  @Post('internal/release')
  @HttpCode(200)
  internalRelease(@Headers('x-panel-key') key: string | undefined, @Body() dto: ReleaseDto) {
    this.auth.requirePanelKey(key);
    return { released: this.promo.release(dto.ref) };
  }
}
