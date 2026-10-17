import { useState } from 'react';
import { toast } from 'sonner';
import { useAddon } from '../context';
import { useT } from '../i18n';
import { useApi, useFetch } from '../lib/api';
import { fmtDateTime, fmtMoney } from '../lib/format';
import { Icon } from '../components/icons';
import { Badge, Card, Empty, ErrorBox, Notice, PageSkeleton } from '../components/ui';

interface Me { currency: string; history: { id: string; code: string; context: 'redeem' | 'topup' | 'shop'; effect: number; at: string }[]; wallet: boolean }

/** Page cliente : appliquer un code cadeau (crédit sur le solde) et retrouver les codes déjà utilisés. */
export default function MyCodes() {
  const { token, lang } = useAddon();
  const t = useT();
  const api = useApi();
  const me = useFetch<Me>(token ? 'me' : null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ credited: number; code: string } | null>(null);
  const [err, setErr] = useState('');

  if (!token) return <div className="page"><Empty icon="key" title={t('noToken')} text={t('noTokenText')} /></div>;
  if (me.loading && !me.data) return <div className="page"><PageSkeleton rows={3} /></div>;
  if (me.error && !me.data) return <div className="page"><ErrorBox message={me.error} onRetry={me.reload} /></div>;

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr('');
    setDone(null);
    try {
      const r = await api.post<{ credited: number; code: string }>('redeem', { code: code.trim() });
      setDone({ credited: r.credited, code: r.code });
      setCode('');
      toast.success(t('applied'));
      me.reload();
    } catch (ex: any) {
      const key = `reason.${String(ex.message)}`;
      setErr(t(key) !== key ? t(key) : String(ex.message));
    } finally {
      setBusy(false);
    }
  };

  const history = me.data?.history ?? [];
  return (
    <div className="page stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('myCodes')}</h1>
          <p className="page-sub">{t('myCodesSub')}</p>
        </div>
      </div>

      {me.data && !me.data.wallet && <Notice tone="warn">{t('walletDown')}</Notice>}

      <Card title={<span className="row gap-2"><Icon name="gift" size={16} />{t('redeemTitle')}</span>}>
        <form className="stack-sm" onSubmit={apply}>
          <p className="text-sm text-muted">{t('redeemHelp')}</p>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input
              className="input mono"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('codePlaceholder')}
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              aria-label={t('codePlaceholder')}
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !code.trim() || (me.data ? !me.data.wallet : false)}>
              {busy ? '…' : <><Icon name="check" size={14} />{t('apply')}</>}
            </button>
          </div>
          {err && <Notice tone="error">{err}</Notice>}
          {done && <Notice tone="success" icon="gift">{t('credited', { v: fmtMoney(done.credited, me.data?.currency ?? 'EUR', lang), code: done.code })}</Notice>}
        </form>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="section-box"><b className="row gap-2"><Icon name="wallet" size={15} />{t('howWallet')}</b><p className="text-sm text-muted mt-1">{t('howWalletText')}</p></div>
        <div className="section-box"><b className="row gap-2"><Icon name="cart" size={15} />{t('howShop')}</b><p className="text-sm text-muted mt-1">{t('howShopText')}</p></div>
      </div>

      <Card title={t('history')} flush>
        {history.length === 0 ? (
          <Empty icon="ticket" title={t('noHistory')} text={t('noHistoryText')} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('code')}</th><th>{t('usedFor')}</th><th className="num">{t('benefit')}</th><th>{t('date')}</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td><span className="mono text-bold">{h.code}</span></td>
                    <td><Badge tone={h.context === 'shop' ? 'info' : 'good'} icon={h.context === 'shop' ? 'cart' : 'wallet'}>{t(`ctx.${h.context}`)}</Badge></td>
                    <td className="num"><b>{fmtMoney(h.effect, me.data?.currency ?? 'EUR', lang)}</b></td>
                    <td className="text-sm text-muted">{fmtDateTime(h.at, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
