import { Injectable, Logger } from '@nestjs/common';

/** Envoi d'un e-mail via le panel (POST /api/v1/mail/send, clé API du panel). Silencieux en cas d'échec : un e-mail ne bloque jamais une opération. */
@Injectable()
export class PanelMailClient {
  private readonly logger = new Logger(PanelMailClient.name);
  private readonly panelUrl = (process.env.PANEL_URL ?? 'http://localhost:8000').replace(/\/+$/, '');
  private readonly key = process.env.PANEL_API_KEY ?? '';

  async send(template: string, to: string, vars: Record<string, string>): Promise<void> {
    if (!this.key || !to) return;
    try {
      await fetch(`${this.panelUrl}/api/v1/mail/send`, {
        method: 'POST',
        headers: { 'X-API-Key': this.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, to, vars }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (e: any) {
      this.logger.debug(`E-mail ${template} non envoyé : ${e?.message ?? e}`);
    }
  }
}
