export type Kind = 'credit' | 'topup_bonus' | 'discount';

export interface Code {
  id: string;
  code: string;
  label: string;
  description: string;
  kind: Kind;
  active: boolean;
  percent: number;
  fixed: number;
  max_effect: number;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number;
  max_uses_per_user: number;
  min_amount: number;
  max_amount: number;
  product_ids: string[];
  exclude_product_ids: string[];
  min_items: number;
  first_order_only: boolean;
  user_ids: string[];
  emails: string[];
  email_domains: string[];
  payment_methods: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  uses?: number;
}

export interface Redemption {
  id: string;
  code_id: string;
  code: string;
  user_id: string;
  user_email: string;
  context: 'redeem' | 'topup' | 'shop';
  ref: string;
  effect: number;
  status: 'active' | 'released';
  at: string;
}

export const EMPTY_CODE: Omit<Code, 'id' | 'created_at' | 'updated_at'> = {
  code: '', label: '', description: '', kind: 'discount', active: true,
  percent: 10, fixed: 0, max_effect: 0, starts_at: null, expires_at: null,
  max_uses: 0, max_uses_per_user: 0, min_amount: 0, max_amount: 0,
  product_ids: [], exclude_product_ids: [], min_items: 0, first_order_only: false,
  user_ids: [], emails: [], email_domains: [], payment_methods: [], notes: '',
};
