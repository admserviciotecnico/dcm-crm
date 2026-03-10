import { ReactNode } from 'react';

type Variant = 'orders' | 'clients' | 'equipments' | 'default';

function OrdersSvg() {
  return (
    <svg viewBox="0 0 120 80" className="mx-auto h-20 w-28 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="16" y="14" width="88" height="52" rx="8" />
      <path d="M28 30h64M28 42h52M28 54h36" />
      <circle cx="92" cy="54" r="8" />
    </svg>
  );
}

function ClientsSvg() {
  return (
    <svg viewBox="0 0 120 80" className="mx-auto h-20 w-28 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="40" cy="30" r="10" />
      <circle cx="74" cy="28" r="8" />
      <path d="M24 58c4-10 28-10 32 0M62 56c3-8 20-8 24 0" />
      <rect x="12" y="12" width="96" height="56" rx="10" />
    </svg>
  );
}

function EquipmentsSvg() {
  return (
    <svg viewBox="0 0 120 80" className="mx-auto h-20 w-28 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="18" y="24" width="84" height="34" rx="6" />
      <path d="M34 24v-8h52v8M34 58v6h12v-6M74 58v6h12v-6" />
      <circle cx="38" cy="41" r="4" />
      <path d="M50 41h34" />
    </svg>
  );
}

export function EmptyState({ title, subtitle, action, variant = 'default' }: { title: string; subtitle: string; action?: ReactNode; variant?: Variant }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-10 text-center">
      {variant === 'orders' ? <OrdersSvg /> : variant === 'clients' ? <ClientsSvg /> : variant === 'equipments' ? <EquipmentsSvg /> : <OrdersSvg />}
      <p className="mt-3 text-lg font-semibold">{title}</p>
      <p className="text-sm text-slate-400">{subtitle}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
