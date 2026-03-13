import Link from 'next/link';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function TechnicianLocationCard({ technician, client, orderId, address, status, clientId, delayed }: { technician: string; client: string; orderId: string; address: string; status: string; clientId: string; delayed?: boolean }) {
  return (
    <div className={`rounded-[10px] border bg-[var(--bg-surface)] p-3 text-sm shadow-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)] ${delayed ? 'border-amber-400/60' : 'border-[var(--border)]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{technician}</p>
        <div className="flex items-center gap-2">
          {delayed ? <Badge className="border-amber-300 bg-amber-100 text-amber-800"><AlertTriangle size={12} /> Demorada</Badge> : null}
          <Badge>{status}</Badge>
        </div>
      </div>
      <p className="text-[var(--text-secondary)]">Cliente: {client}</p>
      <p className="mono text-xs">Orden #{orderId.slice(0, 8)}</p>
      <p className="mb-2 text-xs text-[var(--text-secondary)]">{address}</p>
      <div className="flex gap-2">
        <Link href={`/orders/${orderId}`}><Button variant="secondary">Abrir orden <ArrowUpRight size={14} /></Button></Link>
        <Link href={`/clients/${clientId}`}><Button variant="secondary">Cliente</Button></Link>
      </div>
    </div>
  );
}
