import { useStore } from '@/store/store';
import { CURRENCIES } from './constants';

const cache = new Map<string, ReturnType<typeof build>>();
export const makeFormatter = (currency: string) => {
  if (!cache.has(currency)) cache.set(currency, build(currency));
  return cache.get(currency)!;
};

function build(currency: string) {
  const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? 'en-US';
  const full = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
  const symbol = full.formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency;
  // Indian-style units for INR/PKR (K, L, Cr), international units otherwise (K, M, B).
  const units: [number, string][] = currency === 'INR' || currency === 'PKR'
    ? [[1e7, 'Cr'], [1e5, 'L'], [1e3, 'K']]
    : [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  const compact = (n: number) => {
    const v = Math.abs(n || 0);
    const sign = n < 0 ? '-' : '';
    if (v < 10000) return full.format(Math.round(n || 0));
    const [div, u] = units.find(([d]) => v >= d)!;
    const x = v / div;
    return `${sign}${symbol}${x >= 100 ? x.toFixed(0) : x.toFixed(1).replace(/\.0$/, '')}${u}`;
  };
  return { money: (n: number) => full.format(Math.round(n || 0)), compact, symbol };
}

export function useMoney() {
  const currency = useStore((s) => s.settings.currency);
  return makeFormatter(currency);
}
