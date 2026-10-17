import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Types de codes :
 *  - 'credit'      : ajoute `fixed` au solde Wallet quand le client l'applique (page « Mon solde »).
 *  - 'topup_bonus' : bonus (pourcentage et/ou montant fixe) ajouté à une recharge du solde.
 *  - 'discount'    : réduction (pourcentage et/ou montant fixe) sur un panier de la boutique.
 */
export type PromoKind = 'credit' | 'topup_bonus' | 'discount';

export interface PromoCode {
  id: string;
  /** Code saisi par le client (majuscules, chiffres, - et _). */
  code: string;
  label: string;
  description: string;
  kind: PromoKind;
  active: boolean;

  // ── Valeur ──
  /** 0-100 : bonus / réduction en %. */
  percent: number;
  /** Montant fixe : crédit offert, bonus fixe ou réduction fixe. */
  fixed: number;
  /** Plafond du bonus / de la réduction (0 = aucun). */
  max_effect: number;

  // ── Conditions (0 / vide = pas de condition) ──
  starts_at: string | null;
  expires_at: string | null;
  /** Utilisations totales (0 = illimité). */
  max_uses: number;
  /** Utilisations par client (0 = illimité). */
  max_uses_per_user: number;
  /** Panier (discount) ou recharge (topup_bonus) minimum / maximum. */
  min_amount: number;
  max_amount: number;
  /** discount : produits concernés (vide = tous) et produits exclus. */
  product_ids: string[];
  exclude_product_ids: string[];
  /** discount : nombre minimum d'articles dans le panier. */
  min_items: number;
  /** discount : réservé aux clients sans commande payée. */
  first_order_only: boolean;
  /** Réservé à ces comptes (ids du panel) / ces e-mails / ces domaines d'e-mail (vide = tout le monde). */
  user_ids: string[];
  emails: string[];
  email_domains: string[];
  /** discount : moyens de paiement autorisés (wallet, stripe, nowpayments, paypal ; vide = tous). */
  payment_methods: string[];
  /** Note interne (jamais montrée au client). */
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: string;
  code_id: string;
  code: string;
  user_id: string;
  user_email: string;
  context: 'redeem' | 'topup' | 'shop';
  /** Référence unique côté appelant (commande, recharge…) : rend l'utilisation idempotente. */
  ref: string;
  /** Crédit offert / bonus / réduction réellement accordé. */
  effect: number;
  /** 'released' = utilisation annulée (commande annulée / expirée) : ne compte plus dans les limites. */
  status: 'active' | 'released';
  at: string;
}

interface StoreData {
  codes: Record<string, PromoCode>;
  redemptions: Redemption[];
}

/** Persistance JSON atomique (fichier 0600), mise de côté d'un fichier illisible — même mécanique que les autres addons. */
@Injectable()
export class StoreService implements OnModuleInit {
  private readonly logger = new Logger(StoreService.name);
  private readonly dbPath: string;
  private data: StoreData = { codes: {}, redemptions: [] };
  private readOnly = false;

  constructor() {
    const defaultDb = path.resolve(__dirname, '..', '..', '..', 'promocodes-data.json');
    this.dbPath = path.resolve(process.env.DB_PATH ?? defaultDb);
  }

  onModuleInit() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const parsed = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        this.data = {
          codes: parsed?.codes && typeof parsed.codes === 'object' ? parsed.codes : {},
          redemptions: Array.isArray(parsed?.redemptions) ? parsed.redemptions : [],
        };
        this.logger.log(`Données chargées depuis ${this.dbPath}`);
      } else {
        this.persist();
        this.logger.log(`Nouveau fichier créé : ${this.dbPath}`);
      }
    } catch {
      const aside = `${this.dbPath}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(this.dbPath, aside);
        this.logger.error(`${this.dbPath} illisible — conservé sous ${aside} ; démarrage avec des données vides.`);
      } catch {
        this.logger.error(`${this.dbPath} illisible et impossible à mettre de côté — écritures désactivées pour ne rien écraser.`);
        this.readOnly = true;
      }
    }
  }

  get codes(): Record<string, PromoCode> {
    return this.data.codes;
  }

  get redemptions(): Redemption[] {
    return this.data.redemptions;
  }

  codeByCode(code: string): PromoCode | undefined {
    return Object.values(this.data.codes).find((c) => c.code === code);
  }

  setCode(c: PromoCode): void {
    this.data.codes[c.id] = c;
    this.persist();
  }

  setMany(codes: PromoCode[]): void {
    for (const c of codes) this.data.codes[c.id] = c;
    this.persist();
  }

  deleteCode(id: string): void {
    delete this.data.codes[id];
    this.persist();
  }

  addRedemption(r: Redemption): void {
    this.data.redemptions.push(r);
    if (this.data.redemptions.length > 50_000) this.data.redemptions = this.data.redemptions.slice(-50_000);
    this.persist();
  }

  touch(): void {
    this.persist();
  }

  restoreData(s: { codes: Record<string, PromoCode>; redemptions: Redemption[] }): void {
    this.data = { codes: s.codes, redemptions: s.redemptions };
    this.persist();
  }

  private persist(): void {
    if (this.readOnly) return;
    const tmp = this.dbPath + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmp, this.dbPath);
    } catch (err) {
      this.logger.error('Erreur de persistance :', err);
    }
  }
}
