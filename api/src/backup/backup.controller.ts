import { Controller, Get, Post, Body, Headers, Logger } from '@nestjs/common';
import { StoreService } from '../promo/store.service';
import { PanelAuthService } from '../auth/panel-auth.service';

/**
 * Sauvegarde / restauration pour le panel (déclaré dans uhq-manifest.json). Auth : X-Panel-Key (comparaison à temps
 * constant ; REFUSÉ si la clé du panel n'est pas configurée).
 */
@Controller('api/backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(private readonly store: StoreService, private readonly auth: PanelAuthService) {}

  @Get('export')
  export(@Headers('x-panel-key') key: string) {
    this.auth.requirePanelKey(key);
    const data = { codes: Object.values(this.store.codes), redemptions: this.store.redemptions, exportedAt: new Date().toISOString() };
    this.logger.log(`Backup export: ${data.codes.length} codes, ${data.redemptions.length} utilisations`);
    return data;
  }

  @Post('import')
  import(@Headers('x-panel-key') key: string, @Body() body: { codes?: any[]; redemptions?: any[] }) {
    this.auth.requirePanelKey(key);
    const codes: Record<string, any> = {};
    for (const c of Array.isArray(body?.codes) ? body.codes : []) {
      if (c && typeof c.id === 'string' && typeof c.code === 'string') codes[c.id] = c;
    }
    const redemptions = (Array.isArray(body?.redemptions) ? body.redemptions : []).filter((r: any) => r && typeof r.code_id === 'string');
    this.store.restoreData({ codes, redemptions });
    this.logger.log(`Backup import: ${Object.keys(codes).length} codes, ${redemptions.length} utilisations`);
    return { success: true, restored: Object.keys(codes).length };
  }
}
