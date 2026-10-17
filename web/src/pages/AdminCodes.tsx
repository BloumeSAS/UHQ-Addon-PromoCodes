import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAddon } from '../context';
import { useT } from '../i18n';
import { createApi, useApi, useDebounced, useFetch } from '../lib/api';
import { downloadFile, fmtDate, fmtDateTime, fmtMoney, toCsv } from '../lib/format';
import { Icon, IconName } from '../components/icons';
import { Badge, CopyButton, Card, Empty, ErrorBox, Field, Modal, Notice, PageSkeleton, Pagination, SearchInput, Seg, Stat, Switch, Tabs, useConfirm } from '../components/ui';
import { Code, EMPTY_CODE, Kind, Redemption } from '../lib/types';

interface Stats { codes: number; active: number; uses: number; usesMonth: number; creditGiven: number; bonusGiven: number; discountGiven: number }
interface ProductLite { id: string; name: string; price: number; active: boolean }

type Tab = 'codes' | 'uses';
const PAGE = 15;
const KIND_ICON: Record<Kind, IconName> = { credit: 'gift', topup_bonus: 'wallet', discount: 'cart' };
const KIND_TONE: Record<Kind, 'good' | 'primary' | 'info'> = { credit: 'good', topup_bonus: 'primary', discount: 'info' };

/** Gestion des codes promo (admin) : statistiques, liste filtrable, création / modification très complète, génération en lot, utilisations. */
export default function AdminCodes() {
  const { token, role, lang } = useAddon();
  const t = useT();
  const isAdmin = role === 'ADMIN';
  const stats = useFetch<Stats>(token && isAdmin ? 'stats' : null);
  const [tab, setTab] = useState<Tab>('codes');

  if (!token) return <div className="page"><Empty icon="key" title={t('noToken')} text={t('noTokenText')} /></div>;
  if (!isAdmin) return <div className="page"><Empty icon="ban" title={t('noAdmin')} text={t('noAdminText')} /></div>;
  if (stats.loading && !stats.data) return <div className="page"><PageSkeleton /></div>;
  if (stats.error && !stats.data) return <div className="page"><ErrorBox message={stats.error} onRetry={stats.reload} /></div>;
  const s = stats.data;

  return (
    <div className="page stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('promoManagement')}</h1>
          <p className="page-sub">{t('promoManagementSub')}</p>
        </div>
      </div>

      {s && (
        <div className="stat-grid">
          <Stat label={t('stat.codes')} value={s.codes} sub={t('stat.activeCount', { n: s.active })} tone="primary" />
          <Stat label={t('stat.uses')} value={s.uses} sub={t('stat.usesMonth', { n: s.usesMonth })} />
          <Stat label={t('stat.credit')} value={fmtMoney(s.creditGiven, 'EUR', lang)} sub={t('stat.creditSub')} />
          <Stat label={t('stat.bonus')} value={fmtMoney(s.bonusGiven, 'EUR', lang)} sub={t('stat.bonusSub')} />
          <Stat label={t('stat.discount')} value={fmtMoney(s.discountGiven, 'EUR', lang)} sub={t('stat.discountSub')} />
        </div>
      )}

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[{ id: 'codes', label: t('tab.codes'), icon: 'ticket' }, { id: 'uses', label: t('tab.uses'), icon: 'history' }]}
      />
      {tab === 'codes' ? <CodesTab onChanged={stats.reload} /> : <UsesTab />}
    </div>
  );
}

// ─── Liste des codes ───────────────────────────────────────────────────────────

function valueText(c: Code, t: ReturnType<typeof useT>, lang: 'fr' | 'en'): string {
  const parts: string[] = [];
  if (c.kind === 'credit') return `+${fmtMoney(c.fixed, 'EUR', lang)}`;
  if (c.percent > 0) parts.push(`${c.percent} %`);
  if (c.fixed > 0) parts.push(fmtMoney(c.fixed, 'EUR', lang));
  let txt = parts.join(' + ');
  if (c.max_effect > 0) txt += ` (${t('capShort')} ${fmtMoney(c.max_effect, 'EUR', lang)})`;
  return c.kind === 'topup_bonus' ? `+${txt}` : `−${txt}`;
}

function CodesTab({ onChanged }: { onChanged: () => void }) {
  const t = useT();
  const { lang } = useAddon();
  const api = useApi();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [status, setStatus] = useState('all');
  const [offset, setOffset] = useState(0);
  const path = `codes?limit=${PAGE}&offset=${offset}${kind !== 'all' ? `&kind=${kind}` : ''}${status !== 'all' ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const { data, loading, error, reload } = useFetch<{ codes: Code[]; total: number }>(path);
  const [editing, setEditing] = useState<Code | 'new' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirm, confirmEl] = useConfirm();

  const refresh = () => { reload(); onChanged(); };
  const toggle = async (c: Code, active: boolean) => {
    try { await api.patch(`codes/${c.id}`, { active }); refresh(); } catch (e: any) { toast.error(e.message); }
  };
  const remove = async (c: Code) => {
    if (!(await confirm({ title: t('delete'), message: t('confirmDelete', { code: c.code }), confirmLabel: t('delete') }))) return;
    try { await api.del(`codes/${c.id}`); refresh(); } catch (e: any) { toast.error(e.message); }
  };
  const duplicate = (c: Code) => setEditing({ ...c, id: '', code: `${c.code}-2`, uses: 0 });

  const codes = data?.codes ?? [];
  return (
    <div className="stack">
      <div className="row">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setOffset(0); }} placeholder={t('searchCodes')} />
        <Seg<'all' | Kind>
          label={t('type')}
          value={kind}
          onChange={(v) => { setKind(v); setOffset(0); }}
          options={[{ id: 'all', label: t('filter.all') }, { id: 'credit', label: t('kind.credit.short') }, { id: 'topup_bonus', label: t('kind.topup_bonus.short') }, { id: 'discount', label: t('kind.discount.short') }]}
        />
        <select className="input" style={{ width: 'auto' }} value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} aria-label={t('status')}>
          <option value="all">{t('status.all')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="inactive">{t('status.inactive')}</option>
          <option value="expired">{t('status.expired')}</option>
          <option value="exhausted">{t('status.exhausted')}</option>
        </select>
        <button className="btn btn-outline" onClick={() => setGenerating(true)}><Icon name="layers" size={15} />{t('generate')}</button>
        <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={15} />{t('newCode')}</button>
      </div>

      {error && !data ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <PageSkeleton rows={4} /> : codes.length === 0 ? (
        <Card>
          <Empty
            icon="ticket"
            title={q || kind !== 'all' || status !== 'all' ? t('noResults') : t('emptyTitle')}
            text={q || kind !== 'all' || status !== 'all' ? t('noResultsText') : t('emptyText')}
            action={!q && kind === 'all' && status === 'all' ? <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={15} />{t('createFirst')}</button> : undefined}
          />
        </Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('code')}</th><th>{t('type')}</th><th>{t('value')}</th><th>{t('uses')}</th><th>{t('validity')}</th><th>{t('active')}</th><th style={{ textAlign: 'right' }}>{t('actions')}</th></tr></thead>
              <tbody>
                {codes.map((c) => {
                  const expired = !!c.expires_at && Date.parse(c.expires_at) <= Date.now();
                  const exhausted = c.max_uses > 0 && (c.uses ?? 0) >= c.max_uses;
                  return (
                    <tr key={c.id} style={{ opacity: c.active && !expired && !exhausted ? 1 : 0.6 }}>
                      <td>
                        <div className="row gap-1" style={{ flexWrap: 'nowrap' }}><span className="mono text-bold">{c.code}</span><CopyButton text={c.code} small /></div>
                        {c.label && <div className="text-xs text-muted truncate" style={{ maxWidth: 220 }}>{c.label}</div>}
                      </td>
                      <td><Badge tone={KIND_TONE[c.kind]} icon={KIND_ICON[c.kind]}>{t(`kind.${c.kind}.short`)}</Badge></td>
                      <td><b>{valueText(c, t, lang)}</b></td>
                      <td className="text-sm">{c.uses ?? 0}{c.max_uses > 0 ? ` / ${c.max_uses}` : ' / ∞'}{exhausted && <Badge tone="warn">{t('status.exhausted')}</Badge>}</td>
                      <td className="text-sm">{c.expires_at ? <span className={expired ? 'text-red' : ''}>{expired ? t('expiredOn', { d: fmtDate(c.expires_at, lang) }) : t('until', { d: fmtDate(c.expires_at, lang) })}</span> : <span className="text-muted">{t('noExpiry')}</span>}</td>
                      <td><Switch checked={c.active} onChange={(v) => void toggle(c, v)} label={t('active')} /></td>
                      <td>
                        <div className="row gap-1" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(c)}><Icon name="edit" size={13} />{t('edit')}</button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => duplicate(c)} title={t('duplicate')} aria-label={t('duplicate')}><Icon name="copyPlus" size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void remove(c)} title={t('delete')} aria-label={t('delete')}><Icon name="trash" size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={data?.total ?? 0} limit={PAGE} offset={offset} onChange={setOffset} />
        </Card>
      )}

      {editing && <CodeModal code={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {generating && <GenerateModal onClose={() => setGenerating(false)} onDone={() => { refresh(); }} />}
      {confirmEl}
    </div>
  );
}

// ─── Formulaire d'un code ──────────────────────────────────────────────────────

type Draft = Omit<Code, 'id' | 'created_at' | 'updated_at'> & { startsLocal: string; expiresLocal: string };

const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const num = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(',', '.')));
const lines = (s: string) => s.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);

function toDraft(c: Code | null): Draft {
  const base = c ?? { ...EMPTY_CODE, id: '', created_at: '', updated_at: '' };
  return { ...base, startsLocal: toLocalInput(base.starts_at), expiresLocal: toLocalInput(base.expires_at) };
}

function randomCode(len = 8) {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => alpha[x % alpha.length]).join('');
}

/** Produits de la boutique (addon Orders) pour cibler un code — repli sur la saisie d'identifiants si Orders est absent. */
function useProducts() {
  const { token } = useAddon();
  const [products, setProducts] = useState<ProductLite[] | null>(null);
  useEffect(() => {
    let alive = true;
    // Orders est servi sous la même origine que cet addon quand ils sont embarqués dans le panel : appel direct avec le jeton.
    fetch(`${window.location.origin}/addon-proxy/orders/api/products?all=true`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setProducts(Array.isArray(j?.products) ? j.products.map((p: any) => ({ id: p.id, name: p.name, price: p.price, active: p.active })) : null))
      .catch(() => alive && setProducts(null));
    return () => { alive = false; };
  }, [token]);
  return products;
}

function ProductPicker({ value, onChange, products, label, hint }: { value: string[]; onChange: (v: string[]) => void; products: ProductLite[] | null; label: string; hint?: string }) {
  const t = useT();
  if (!products) {
    return (
      <Field label={label} hint={hint ?? t('idsHint')}>
        <textarea className="input mono" rows={2} value={value.join('\n')} onChange={(e) => onChange(lines(e.target.value))} placeholder="product-id-1" />
      </Field>
    );
  }
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Field label={label} hint={hint}>
      <div className="stack-sm" style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.55rem', padding: '0.5rem' }}>
        {products.length === 0 && <span className="text-sm text-muted">{t('noProducts')}</span>}
        {products.map((p) => (
          <label key={p.id} className="row gap-2 text-sm" style={{ cursor: 'pointer', flexWrap: 'nowrap' }}>
            <input type="checkbox" checked={value.includes(p.id)} onChange={() => toggle(p.id)} />
            <span className="truncate">{p.name}</span>
            {!p.active && <Badge tone="muted">{t('inactiveProduct')}</Badge>}
          </label>
        ))}
      </div>
    </Field>
  );
}

function CodeModal({ code, onClose, onSaved }: { code: Code | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const api = useApi();
  const products = useProducts();
  const isNew = !code || !code.id;
  const [d, setD] = useState<Draft>(() => toDraft(code));
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const errors: Record<string, string> = {};
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(d.code.trim())) errors.code = t('err.code');
  if (d.kind === 'credit') {
    if (!(d.fixed > 0)) errors.fixed = t('err.fixedPositive');
  } else if (!(d.percent > 0 || d.fixed > 0)) errors.percent = t('err.valueRequired');
  if (d.percent < 0 || d.percent > 100) errors.percent = t('err.percent');
  if (d.startsLocal && d.expiresLocal && new Date(d.expiresLocal) <= new Date(d.startsLocal)) errors.expires = t('err.dates');
  if (d.min_amount > 0 && d.max_amount > 0 && d.max_amount < d.min_amount) errors.max_amount = t('err.minMax');
  const invalid = Object.keys(errors).length > 0;
  const show = (k: string) => (tried ? errors[k] : undefined);

  const save = async () => {
    setTried(true);
    if (invalid) return;
    setBusy(true);
    const { startsLocal, expiresLocal, ...rest } = d;
    const body: Record<string, unknown> = { ...rest, code: d.code.trim().toUpperCase(), starts_at: fromLocalInput(startsLocal), expires_at: fromLocalInput(expiresLocal) };
    delete body.uses; delete body.id; delete body.created_at; delete body.updated_at;
    try {
      if (isNew) await api.post('codes', body);
      else { delete body.kind; await api.patch(`codes/${code!.id}`, body); }
      toast.success(t('saved'));
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  const kinds: Kind[] = ['credit', 'topup_bonus', 'discount'];
  const discount = d.kind === 'discount';
  const topup = d.kind === 'topup_bonus';
  const amountLabel = discount ? t('cartAmount') : t('topupAmount');

  return (
    <Modal
      title={isNew ? t('newCode') : t('editCode')}
      onClose={onClose}
      busy={busy}
      size="lg"
      footer={<><button className="btn btn-outline" onClick={onClose} disabled={busy}>{t('ui.cancel')}</button><button className="btn btn-primary" onClick={save} disabled={busy || (tried && invalid)}>{busy ? '…' : isNew ? t('create') : t('save')}</button></>}
    >
      <div className="stack">
        <section className="stack-sm">
          <h4 className="section-title">{t('sec.type')}</h4>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {kinds.map((k) => (
              <button key={k} type="button" className={`choice ${d.kind === k ? 'active' : ''}`} disabled={!isNew && d.kind !== k} onClick={() => isNew && set('kind', k)}>
                <Icon name={KIND_ICON[k]} size={18} /><span><b>{t(`kind.${k}`)}</b><div className="text-xs text-muted">{t(`kind.${k}.hint`)}</div></span>
              </button>
            ))}
          </div>
          {!isNew && <span className="hint">{t('kindLocked')}</span>}
        </section>

        <section className="stack-sm">
          <h4 className="section-title">{t('sec.general')}</h4>
          <div className="form-grid">
            <Field label={t('code')} error={show('code')} hint={t('codeHint')}>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input className={`input mono ${show('code') ? 'invalid' : ''}`} value={d.code} maxLength={40} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="BIENVENUE10" autoFocus />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => set('code', randomCode())}>{t('random')}</button>
              </div>
            </Field>
            <Field label={t('label')} hint={t('labelHint')}><input className="input" value={d.label} maxLength={80} onChange={(e) => set('label', e.target.value)} placeholder={t('labelPlaceholder')} /></Field>
          </div>
          <Field label={t('description')} hint={t('descriptionHint')}><textarea className="input" rows={2} value={d.description} maxLength={400} onChange={(e) => set('description', e.target.value)} /></Field>
          <label className="row gap-3" style={{ cursor: 'pointer' }}><Switch checked={d.active} onChange={(v) => set('active', v)} label={t('active')} /><span><b>{t('active')}</b><div className="text-xs text-muted">{t('activeHint')}</div></span></label>
        </section>

        <section className="stack-sm">
          <h4 className="section-title">{t('sec.value')}</h4>
          {d.kind === 'credit' ? (
            <div className="form-grid">
              <Field label={t('creditAmount')} error={show('fixed')} hint={t('creditAmountHint')}><input className={`input ${show('fixed') ? 'invalid' : ''}`} inputMode="decimal" value={d.fixed || ''} onChange={(e) => set('fixed', num(e.target.value))} placeholder="5" /></Field>
            </div>
          ) : (
            <>
              <div className="form-grid">
                <Field label={t('percent')} error={show('percent')} hint={discount ? t('percentHintDiscount') : t('percentHintBonus')}><input className={`input ${show('percent') ? 'invalid' : ''}`} inputMode="decimal" value={d.percent || ''} onChange={(e) => set('percent', num(e.target.value))} placeholder="10" /></Field>
                <Field label={t('fixedAmount')} hint={t('fixedHint')}><input className="input" inputMode="decimal" value={d.fixed || ''} onChange={(e) => set('fixed', num(e.target.value))} placeholder="0" /></Field>
                <Field label={t('maxEffect')} hint={t('maxEffectHint')}><input className="input" inputMode="decimal" value={d.max_effect || ''} onChange={(e) => set('max_effect', num(e.target.value))} placeholder="∞" /></Field>
              </div>
            </>
          )}
        </section>

        <section className="stack-sm">
          <h4 className="section-title">{t('sec.limits')}</h4>
          <div className="form-grid">
            <Field label={t('startsAt')} hint={t('emptyNow')}><input className="input" type="datetime-local" value={d.startsLocal} onChange={(e) => set('startsLocal', e.target.value)} /></Field>
            <Field label={t('expiresAt')} error={show('expires')} hint={t('emptyNever')}><input className={`input ${show('expires') ? 'invalid' : ''}`} type="datetime-local" value={d.expiresLocal} onChange={(e) => set('expiresLocal', e.target.value)} /></Field>
            <Field label={t('maxUses')} hint={t('emptyUnlimited')}><input className="input" inputMode="numeric" value={d.max_uses || ''} onChange={(e) => set('max_uses', Math.floor(num(e.target.value)))} placeholder="∞" /></Field>
            <Field label={t('maxUsesPerUser')} hint={d.kind === 'credit' ? t('perUserCreditHint') : t('emptyUnlimited')}><input className="input" inputMode="numeric" value={d.max_uses_per_user || ''} onChange={(e) => set('max_uses_per_user', Math.floor(num(e.target.value)))} placeholder={d.kind === 'credit' ? '1' : '∞'} /></Field>
          </div>
        </section>

        {d.kind !== 'credit' && (
          <section className="stack-sm">
            <h4 className="section-title">{t('sec.conditions')}</h4>
            <div className="form-grid">
              <Field label={t('minAmount', { what: amountLabel })} hint={t('emptyNone')}><input className="input" inputMode="decimal" value={d.min_amount || ''} onChange={(e) => set('min_amount', num(e.target.value))} placeholder="0" /></Field>
              <Field label={t('maxAmount', { what: amountLabel })} error={show('max_amount')} hint={t('emptyNone')}><input className={`input ${show('max_amount') ? 'invalid' : ''}`} inputMode="decimal" value={d.max_amount || ''} onChange={(e) => set('max_amount', num(e.target.value))} placeholder="∞" /></Field>
              {discount && <Field label={t('minItems')} hint={t('emptyNone')}><input className="input" inputMode="numeric" value={d.min_items || ''} onChange={(e) => set('min_items', Math.floor(num(e.target.value)))} placeholder="0" /></Field>}
            </div>
            {discount && (
              <>
                <ProductPicker value={d.product_ids} onChange={(v) => set('product_ids', v)} products={products} label={t('onlyProducts')} hint={t('onlyProductsHint')} />
                <ProductPicker value={d.exclude_product_ids} onChange={(v) => set('exclude_product_ids', v)} products={products} label={t('excludeProducts')} />
                <Field label={t('paymentMethods')} hint={t('paymentMethodsHint')}>
                  <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
                    {(['wallet', 'stripe', 'nowpayments', 'paypal'] as const).map((m) => (
                      <label key={m} className="row gap-2 text-sm" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={d.payment_methods.includes(m)} onChange={() => set('payment_methods', d.payment_methods.includes(m) ? d.payment_methods.filter((x) => x !== m) : [...d.payment_methods, m])} />
                        {t(`pay.${m}`)}
                      </label>
                    ))}
                  </div>
                </Field>
                <label className="row gap-3" style={{ cursor: 'pointer' }}><Switch checked={d.first_order_only} onChange={(v) => set('first_order_only', v)} label={t('firstOrder')} /><span><b>{t('firstOrder')}</b><div className="text-xs text-muted">{t('firstOrderHint')}</div></span></label>
              </>
            )}
            {topup && <Notice tone="info">{t('topupNote')}</Notice>}
          </section>
        )}

        <section className="stack-sm">
          <h4 className="section-title">{t('sec.audience')}</h4>
          <p className="text-xs text-muted">{t('audienceHint')}</p>
          <div className="form-grid">
            <Field label={t('emails')} hint={t('emailsHint')}><textarea className="input mono" rows={2} value={d.emails.join('\n')} onChange={(e) => set('emails', lines(e.target.value).map((x) => x.toLowerCase()))} placeholder="client@exemple.fr" /></Field>
            <Field label={t('emailDomains')} hint={t('emailDomainsHint')}><textarea className="input mono" rows={2} value={d.email_domains.join('\n')} onChange={(e) => set('email_domains', lines(e.target.value).map((x) => x.toLowerCase()))} placeholder="@entreprise.fr" /></Field>
          </div>
          <Field label={t('userIds')} hint={t('userIdsHint')}><textarea className="input mono" rows={1} value={d.user_ids.join('\n')} onChange={(e) => set('user_ids', lines(e.target.value))} /></Field>
        </section>

        <section className="stack-sm">
          <h4 className="section-title">{t('sec.notes')}</h4>
          <Field hint={t('notesHint')}><textarea className="input" rows={2} value={d.notes} maxLength={400} onChange={(e) => set('notes', e.target.value)} /></Field>
        </section>
      </div>
    </Modal>
  );
}

// ─── Génération en lot ─────────────────────────────────────────────────────────

function GenerateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT();
  const api = useApi();
  const [kind, setKind] = useState<Kind>('credit');
  const [amount, setAmount] = useState('5');
  const [percent, setPercent] = useState('10');
  const [count, setCount] = useState('10');
  const [prefix, setPrefix] = useState('GIFT');
  const [length, setLength] = useState('8');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const template: Record<string, unknown> = { kind, label: prefix ? `${prefix}` : '', expires_at: fromLocalInput(expires), max_uses: 1 };
      if (kind === 'credit') template.fixed = num(amount);
      else { template.percent = num(percent); template.fixed = 0; }
      const r = await api.post<{ generated: number; codes: string[] }>('codes/generate', { template, count: Math.floor(num(count)), prefix, length: Math.floor(num(length)) });
      setResult(r.codes);
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('generateTitle')}
      onClose={onClose}
      busy={busy}
      footer={result
        ? <><button className="btn btn-outline" onClick={() => downloadFile(`codes-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([[t('code')], ...result.map((c) => [c])]), 'text/csv;charset=utf-8')}><Icon name="download" size={14} />{t('downloadCsv')}</button><button className="btn btn-primary" onClick={onClose}>{t('ui.close')}</button></>
        : <><button className="btn btn-outline" onClick={onClose} disabled={busy}>{t('ui.cancel')}</button><button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? '…' : t('generate')}</button></>}
    >
      {result ? (
        <div className="stack-sm">
          <Notice tone="success">{t('generated', { n: result.length })}</Notice>
          <textarea className="input mono" rows={10} readOnly value={result.join('\n')} onFocus={(e) => e.currentTarget.select()} />
          <CopyButton text={result.join('\n')} label={t('copyAll')} small={false} />
        </div>
      ) : (
        <div className="stack-sm">
          <Notice tone="info">{t('generateHelp')}</Notice>
          <Seg<Kind> label={t('type')} value={kind} onChange={setKind} options={[{ id: 'credit', label: t('kind.credit.short') }, { id: 'topup_bonus', label: t('kind.topup_bonus.short') }, { id: 'discount', label: t('kind.discount.short') }]} />
          <div className="form-grid">
            {kind === 'credit'
              ? <Field label={t('creditAmount')}><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              : <Field label={t('percent')}><input className="input" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} /></Field>}
            <Field label={t('count')} hint={t('countHint')}><input className="input" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
            <Field label={t('prefix')} hint={t('prefixHint')}><input className="input mono" value={prefix} maxLength={12} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} /></Field>
            <Field label={t('length')}><input className="input" inputMode="numeric" value={length} onChange={(e) => setLength(e.target.value)} /></Field>
            <Field label={t('expiresAt')} hint={t('emptyNever')}><input className="input" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Utilisations ──────────────────────────────────────────────────────────────

function UsesTab() {
  const t = useT();
  const { lang, token } = useAddon();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [offset, setOffset] = useState(0);
  const { data, loading, error, reload } = useFetch<{ redemptions: Redemption[]; total: number }>(`redemptions?limit=${PAGE}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const rows = data?.redemptions ?? [];
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const api = createApi(token, lang);
      const out: (string | number)[][] = [[t('date'), t('code'), t('usedFor'), t('customer'), t('benefit'), t('reference'), t('status')]];
      for (let off = 0; off < 10_000; off += 200) {
        const r = await api.get<{ redemptions: Redemption[]; total: number }>(`redemptions?limit=200&offset=${off}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
        for (const x of r.redemptions) out.push([x.at, x.code, x.context, x.user_email || x.user_id, x.effect, x.ref, x.status]);
        if (off + 200 >= r.total) break;
      }
      downloadFile(`promo-uses-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(out), 'text/csv;charset=utf-8');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  const total = data?.total ?? 0;
  const label = useMemo(() => ({ redeem: t('ctx.redeem'), topup: t('ctx.topup'), shop: t('ctx.shop') }), [t]);
  return (
    <div className="stack">
      <div className="row">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setOffset(0); }} placeholder={t('searchUses')} />
        <button className="btn btn-outline btn-sm" onClick={exportCsv} disabled={exporting || total === 0}><Icon name="download" size={14} />{t('exportCsv')}</button>
        <button className="btn btn-outline btn-sm" onClick={reload}><Icon name="refresh" size={14} />{t('ui.refresh')}</button>
      </div>
      {error && !data ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <PageSkeleton rows={4} /> : rows.length === 0 ? (
        <Card><Empty icon="history" title={t('noUses')} text={t('noUsesText')} /></Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('date')}</th><th>{t('code')}</th><th>{t('usedFor')}</th><th>{t('customer')}</th><th className="num">{t('benefit')}</th><th>{t('reference')}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ opacity: r.status === 'released' ? 0.55 : 1 }}>
                    <td className="text-sm">{fmtDateTime(r.at, lang)}</td>
                    <td><span className="mono text-bold">{r.code}</span>{r.status === 'released' && <> <Badge tone="muted">{t('released')}</Badge></>}</td>
                    <td><Badge tone={r.context === 'shop' ? 'info' : 'good'}>{label[r.context]}</Badge></td>
                    <td className="text-sm"><div className="truncate" style={{ maxWidth: 220 }}>{r.user_email || r.user_id}</div></td>
                    <td className="num"><b>{fmtMoney(r.effect, 'EUR', lang)}</b></td>
                    <td className="mono text-xs text-muted"><div className="truncate" style={{ maxWidth: 180 }}>{r.ref}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={total} limit={PAGE} offset={offset} onChange={setOffset} />
        </Card>
      )}
    </div>
  );
}
