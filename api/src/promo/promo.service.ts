import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException, HttpException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { PromoCode, PromoKind, Redemption, StoreService } from './store.service';
import { WalletClient } from './wallet.client';
import { PanelMailClient } from './mail.client';

export type Context = 'redeem' | 'topup' | 'shop';
export type Reason =
  | 'unknown' | 'inactive' | 'not_started' | 'expired' | 'exhausted' | 'user_limit' | 'min_amount' | 'max_amount'
  | 'not_eligible_user' | 'not_eligible_product' | 'min_items' | 'first_order_only' | 'payment_method' | 'wrong_context' | 'nothing_to_apply';

export interface ValidateInput {
  code: string;
  user_id: string;
  user_email?: string;
  context: Context;
  /** Panier (shop) ou montant de la recharge (topup). */
  amount?: number;
  items?: { product_id: string; unit_price: number; quantity: number }[];
  payment_method?: string;
  /** Nombre de commandes payées du client (fourni par Orders) — pour `first_order_only`. */
  user_order_count?: number;
}

export interface ValidateResult {
  valid: boolean;
  reason?: Reason;
  code_id?: string;
  code?: string;
  label?: string;
  kind?: PromoKind;
  /** Crédit offert (credit), bonus (topup_bonus) ou réduction (discount), arrondi au centime. */
  effect?: number;
  percent?: number;
  fixed?: number;
}

const KIND_CONTEXT: Record<PromoKind, Context> = { credit: 'redeem', topup_bonus: 'topup', discount: 'shop' };
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const normalizeCode = (c: unknown) => String(c ?? '').toUpperCase().replace(/\s+/g, '');
export const validCode = (c: string) => /^[A-Z0-9_-]{3,40}$/.test(c);

@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);
  /** Tentatives infructueuses par utilisateur (anti-devinette des codes) : 10 par 10 minutes. */
  private readonly misses = new Map<string, { n: number; since: number }>();

  constructor(
    private readonly store: StoreService,
    private readonly wallet: WalletClient,
    private readonly mail: PanelMailClient,
  ) {}

  // ─── Calcul / contrôle ───────────────────────────────────────────────────────

  private activeUses(codeId: string, userId?: string): number {
    let n = 0;
    for (const r of this.store.redemptions) {
      if (r.code_id !== codeId || r.status !== 'active') continue;
      if (userId && r.user_id !== userId) continue;
      n += 1;
    }
    return n;
  }

  /** Contrôle un code sans rien consommer. Toutes les conditions sont vérifiées côté serveur (jamais celles du client). */
  validate(input: ValidateInput): ValidateResult {
    const code = this.store.codeByCode(normalizeCode(input.code));
    if (!code) return { valid: false, reason: 'unknown' };
    return this.evaluate(code, input);
  }

  private evaluate(code: PromoCode, input: ValidateInput): ValidateResult {
    const fail = (reason: Reason): ValidateResult => ({ valid: false, reason, code_id: code.id, code: code.code, label: code.label, kind: code.kind });
    if (!code.active) return fail('inactive');
    if (KIND_CONTEXT[code.kind] !== input.context) return fail('wrong_context');
    const now = Date.now();
    if (code.starts_at && Date.parse(code.starts_at) > now) return fail('not_started');
    if (code.expires_at && Date.parse(code.expires_at) <= now) return fail('expired');
    if (code.max_uses > 0 && this.activeUses(code.id) >= code.max_uses) return fail('exhausted');
    if (code.max_uses_per_user > 0 && this.activeUses(code.id, input.user_id) >= code.max_uses_per_user) return fail('user_limit');

    // Public visé
    const email = String(input.user_email ?? '').trim().toLowerCase();
    if (code.user_ids.length || code.emails.length || code.email_domains.length) {
      const okUser = code.user_ids.includes(input.user_id)
        || (!!email && code.emails.includes(email))
        || (!!email && code.email_domains.some((d) => email.endsWith(d.startsWith('@') ? d : `@${d}`)));
      if (!okUser) return fail('not_eligible_user');
    }

    const amount = Math.max(0, Number(input.amount) || 0);
    let effect = 0;

    if (code.kind === 'credit') {
      effect = code.fixed;
    } else if (code.kind === 'topup_bonus') {
      if (code.min_amount > 0 && amount < code.min_amount) return fail('min_amount');
      if (code.max_amount > 0 && amount > code.max_amount) return fail('max_amount');
      effect = (amount * code.percent) / 100 + code.fixed;
    } else {
      // discount
      if (code.payment_methods.length && !code.payment_methods.includes(String(input.payment_method ?? ''))) return fail('payment_method');
      if (code.first_order_only && (input.user_order_count ?? 0) > 0) return fail('first_order_only');
      const items = input.items ?? [];
      const eligible = items.filter((i) =>
        (!code.product_ids.length || code.product_ids.includes(i.product_id)) && !code.exclude_product_ids.includes(i.product_id));
      if (!eligible.length) return fail('not_eligible_product');
      const count = items.reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0);
      if (code.min_items > 0 && count < code.min_items) return fail('min_items');
      const total = items.reduce((s, i) => s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);
      if (code.min_amount > 0 && total < code.min_amount) return fail('min_amount');
      if (code.max_amount > 0 && total > code.max_amount) return fail('max_amount');
      const base = eligible.reduce((s, i) => s + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0);
      effect = (base * code.percent) / 100 + code.fixed;
      effect = Math.min(effect, base); // jamais plus que la valeur des articles concernés
    }

    if (code.max_effect > 0) effect = Math.min(effect, code.max_effect);
    effect = round2(effect);
    if (!(effect > 0)) return fail('nothing_to_apply');
    return { valid: true, code_id: code.id, code: code.code, label: code.label, kind: code.kind, effect, percent: code.percent, fixed: code.fixed };
  }

  // ─── Consommation (idempotente) / libération ─────────────────────────────────

  /**
   * Revalide puis enregistre l'utilisation. Idempotent par (code, ref) : rejouer le même `ref` renvoie l'utilisation déjà
   * enregistrée sans en créer une seconde. Tout est synchrone (aucun `await` entre contrôle et écriture) : deux requêtes
   * simultanées ne peuvent pas dépasser la limite.
   */
  consume(input: ValidateInput & { ref: string }): ValidateResult & { redemption_id?: string } {
    const ref = String(input.ref ?? '').slice(0, 120);
    if (!ref) throw new BadRequestException('ref requis');
    const code = this.store.codeByCode(normalizeCode(input.code));
    if (!code) return { valid: false, reason: 'unknown' };
    const existing = this.store.redemptions.find((r) => r.code_id === code.id && r.ref === ref && r.status === 'active');
    if (existing) return { valid: true, code_id: code.id, code: code.code, label: code.label, kind: code.kind, effect: existing.effect, redemption_id: existing.id };
    const res = this.evaluate(code, input);
    if (!res.valid) return res;
    const red: Redemption = {
      id: randomUUID(), code_id: code.id, code: code.code, user_id: input.user_id, user_email: String(input.user_email ?? ''),
      context: input.context, ref, effect: res.effect!, status: 'active', at: new Date().toISOString(),
    };
    this.store.addRedemption(red);
    return { ...res, redemption_id: red.id };
  }

  /** Annule les utilisations d'une référence (commande annulée / expirée) : elles ne comptent plus dans les limites. */
  release(ref: string): number {
    let n = 0;
    for (const r of this.store.redemptions) {
      if (r.ref === ref && r.status === 'active') { r.status = 'released'; n += 1; }
    }
    if (n) this.store.touch();
    return n;
  }

  // ─── Application directe d'un code « crédit » par le client ──────────────────

  private checkMissLimit(userId: string): void {
    const m = this.misses.get(userId);
    if (m && Date.now() - m.since < 10 * 60_000 && m.n >= 10) throw new HttpException('Trop de tentatives : réessayez dans quelques minutes.', 429);
  }

  private recordMiss(userId: string): void {
    const m = this.misses.get(userId);
    if (!m || Date.now() - m.since >= 10 * 60_000) this.misses.set(userId, { n: 1, since: Date.now() });
    else m.n += 1;
    if (this.misses.size > 2000) for (const [k, v] of this.misses) if (Date.now() - v.since > 10 * 60_000) this.misses.delete(k);
  }

  /** Le client applique un code crédit : le solde Wallet est crédité. Remboursé (utilisation libérée) si le Wallet échoue. */
  async redeemCredit(user: { id: string; email: string }, rawCode: string): Promise<{ credited: number; code: string; label: string; balance: number | null }> {
    this.checkMissLimit(user.id);
    const input: ValidateInput & { ref: string } = {
      code: rawCode, user_id: user.id, user_email: user.email, context: 'redeem', ref: `redeem:${randomUUID()}`,
    };
    const res = this.consume(input);
    if (!res.valid) {
      this.recordMiss(user.id);
      throw new BadRequestException(res.reason ?? 'unknown');
    }
    try {
      const balance = await this.wallet.credit(user.id, res.effect!, `Code promo ${res.code}`);
      void this.mail.send('promo.redeemed', user.email, { code: res.code!, benefit: `+${res.effect} (solde)` });
      return { credited: res.effect!, code: res.code!, label: res.label ?? '', balance };
    } catch (e: any) {
      this.release(input.ref);
      this.logger.error(`Crédit Wallet impossible pour le code ${res.code} : ${e?.message ?? e}`);
      throw new ServiceUnavailableException('WALLET_UNAVAILABLE');
    }
  }

  historyFor(userId: string) {
    return this.store.redemptions
      .filter((r) => r.user_id === userId && r.status === 'active')
      .slice(-100)
      .reverse()
      .map((r) => ({ id: r.id, code: r.code, context: r.context, effect: r.effect, at: r.at }));
  }

  // ─── Administration ──────────────────────────────────────────────────────────

  private clean(input: Partial<PromoCode>, base?: PromoCode): PromoCode {
    const now = new Date().toISOString();
    const num = (v: unknown, min: number, max: number, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
    };
    const list = (v: unknown, max = 200, len = 100) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max).map((x) => x.slice(0, len)) : []);
    const date = (v: unknown) => {
      if (!v) return null;
      const t = Date.parse(String(v));
      return Number.isFinite(t) ? new Date(t).toISOString() : null;
    };
    const kind: PromoKind = (['credit', 'topup_bonus', 'discount'] as PromoKind[]).includes(input.kind as PromoKind) ? (input.kind as PromoKind) : (base?.kind ?? 'discount');
    const code = normalizeCode(input.code ?? base?.code);
    if (!validCode(code)) throw new BadRequestException('Code invalide : 3 à 40 caractères parmi A-Z, 0-9, - et _.');
    const c: PromoCode = {
      id: base?.id ?? randomUUID(),
      code,
      label: String(input.label ?? base?.label ?? '').slice(0, 80),
      description: String(input.description ?? base?.description ?? '').slice(0, 400),
      kind,
      active: input.active ?? base?.active ?? true,
      percent: round2(num(input.percent ?? base?.percent, 0, 100)),
      fixed: round2(num(input.fixed ?? base?.fixed, 0, 1_000_000)),
      max_effect: round2(num(input.max_effect ?? base?.max_effect, 0, 1_000_000)),
      starts_at: date(input.starts_at !== undefined ? input.starts_at : base?.starts_at),
      expires_at: date(input.expires_at !== undefined ? input.expires_at : base?.expires_at),
      max_uses: Math.floor(num(input.max_uses ?? base?.max_uses, 0, 10_000_000)),
      max_uses_per_user: Math.floor(num(input.max_uses_per_user ?? base?.max_uses_per_user, 0, 10_000)),
      min_amount: round2(num(input.min_amount ?? base?.min_amount, 0, 10_000_000)),
      max_amount: round2(num(input.max_amount ?? base?.max_amount, 0, 10_000_000)),
      product_ids: list(input.product_ids ?? base?.product_ids),
      exclude_product_ids: list(input.exclude_product_ids ?? base?.exclude_product_ids),
      min_items: Math.floor(num(input.min_items ?? base?.min_items, 0, 10_000)),
      first_order_only: input.first_order_only ?? base?.first_order_only ?? false,
      user_ids: list(input.user_ids ?? base?.user_ids),
      emails: list(input.emails ?? base?.emails).map((e) => e.toLowerCase()),
      email_domains: list(input.email_domains ?? base?.email_domains, 50).map((d) => d.toLowerCase()),
      payment_methods: list(input.payment_methods ?? base?.payment_methods, 4).filter((m) => ['wallet', 'stripe', 'nowpayments', 'paypal'].includes(m)),
      notes: String(input.notes ?? base?.notes ?? '').slice(0, 400),
      created_at: base?.created_at ?? now,
      updated_at: now,
    };
    // Cohérence selon le type
    if (kind === 'credit') {
      if (!(c.fixed > 0)) throw new BadRequestException('Un code crédit doit offrir un montant supérieur à 0.');
      c.percent = 0;
      c.max_effect = 0;
      c.min_amount = c.max_amount = c.min_items = 0;
      c.product_ids = []; c.exclude_product_ids = []; c.payment_methods = []; c.first_order_only = false;
      if (!c.max_uses_per_user) c.max_uses_per_user = 1; // un code cadeau ne se réutilise pas à l'infini
    } else {
      if (!(c.percent > 0 || c.fixed > 0)) throw new BadRequestException('Renseignez un pourcentage et/ou un montant fixe.');
      if (kind === 'topup_bonus') { c.product_ids = []; c.exclude_product_ids = []; c.min_items = 0; c.payment_methods = []; c.first_order_only = false; }
    }
    if (c.starts_at && c.expires_at && Date.parse(c.expires_at) <= Date.parse(c.starts_at)) throw new BadRequestException('La date de fin doit suivre la date de début.');
    if (c.min_amount > 0 && c.max_amount > 0 && c.max_amount < c.min_amount) throw new BadRequestException('Le montant maximum doit dépasser le minimum.');
    return c;
  }

  create(input: Partial<PromoCode>): PromoCode {
    const c = this.clean(input);
    if (this.store.codeByCode(c.code)) throw new BadRequestException('Ce code existe déjà.');
    this.store.setCode(c);
    return c;
  }

  update(id: string, input: Partial<PromoCode>): PromoCode {
    const base = this.store.codes[id];
    if (!base) throw new NotFoundException('Code introuvable');
    const c = this.clean({ ...input, kind: base.kind /* le type d'un code existant ne change pas */ }, base);
    const dupe = this.store.codeByCode(c.code);
    if (dupe && dupe.id !== id) throw new BadRequestException('Ce code existe déjà.');
    this.store.setCode(c);
    if (c.code !== base.code) for (const r of this.store.redemptions) if (r.code_id === id) r.code = c.code;
    return c;
  }

  remove(id: string): void {
    if (!this.store.codes[id]) throw new NotFoundException('Code introuvable');
    this.store.deleteCode(id);
  }

  /** Génère N codes uniques d'après un modèle (ex. 100 codes cadeau à usage unique). */
  generate(template: Partial<PromoCode>, count: number, prefix: string, length = 8): PromoCode[] {
    const n = Math.min(500, Math.max(1, Math.floor(count)));
    const pre = normalizeCode(prefix).slice(0, 12);
    const len = Math.min(16, Math.max(6, Math.floor(length)));
    const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 (confusions)
    const out: PromoCode[] = [];
    const seen = new Set<string>();
    let guard = 0;
    while (out.length < n && guard++ < n * 20) {
      const bytes = randomBytes(len);
      let s = '';
      for (let i = 0; i < len; i++) s += ALPHA[bytes[i] % ALPHA.length];
      const code = pre ? `${pre}-${s}` : s;
      if (seen.has(code) || this.store.codeByCode(code)) continue;
      seen.add(code);
      // Un code généré en lot est à usage unique par défaut (le modèle peut l'imposer autrement).
      out.push(this.clean({ ...template, code, max_uses: template.max_uses || 1 }));
    }
    this.store.setMany(out);
    return out;
  }

  list(query: { q?: string; kind?: string; status?: string; limit?: number; offset?: number }) {
    const now = Date.now();
    let rows = Object.values(this.store.codes).sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (query.kind && ['credit', 'topup_bonus', 'discount'].includes(query.kind)) rows = rows.filter((c) => c.kind === query.kind);
    if (query.status === 'active') rows = rows.filter((c) => c.active && (!c.expires_at || Date.parse(c.expires_at) > now) && (!c.max_uses || this.activeUses(c.id) < c.max_uses));
    if (query.status === 'inactive') rows = rows.filter((c) => !c.active);
    if (query.status === 'expired') rows = rows.filter((c) => c.expires_at && Date.parse(c.expires_at) <= now);
    if (query.status === 'exhausted') rows = rows.filter((c) => c.max_uses > 0 && this.activeUses(c.id) >= c.max_uses);
    const q = (query.q ?? '').trim().toLowerCase();
    if (q) rows = rows.filter((c) => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q));
    const total = rows.length;
    const limit = Math.max(1, Math.min(200, Math.floor(query.limit ?? 25)));
    const offset = Math.max(0, Math.floor(query.offset ?? 0));
    return { total, codes: rows.slice(offset, offset + limit).map((c) => ({ ...c, uses: this.activeUses(c.id) })) };
  }

  redemptions(query: { code_id?: string; q?: string; limit?: number; offset?: number }) {
    let rows = [...this.store.redemptions].reverse();
    if (query.code_id) rows = rows.filter((r) => r.code_id === query.code_id);
    const q = (query.q ?? '').trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.code.toLowerCase().includes(q) || r.user_email.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q));
    const total = rows.length;
    const limit = Math.max(1, Math.min(200, Math.floor(query.limit ?? 25)));
    const offset = Math.max(0, Math.floor(query.offset ?? 0));
    return { total, redemptions: rows.slice(offset, offset + limit) };
  }

  stats() {
    const codes = Object.values(this.store.codes);
    const now = Date.now();
    const act = this.store.redemptions.filter((r) => r.status === 'active');
    const month = new Date().toISOString().slice(0, 7);
    const sum = (rows: Redemption[]) => round2(rows.reduce((s, r) => s + r.effect, 0));
    return {
      codes: codes.length,
      active: codes.filter((c) => c.active && (!c.expires_at || Date.parse(c.expires_at) > now)).length,
      uses: act.length,
      usesMonth: act.filter((r) => r.at.startsWith(month)).length,
      creditGiven: sum(act.filter((r) => r.context === 'redeem')),
      bonusGiven: sum(act.filter((r) => r.context === 'topup')),
      discountGiven: sum(act.filter((r) => r.context === 'shop')),
    };
  }
}
