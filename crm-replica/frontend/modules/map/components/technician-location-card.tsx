import { Badge } from '@/components/ui/badge';

export function TechnicianLocationCard({ technician, client, orderId, address, status }: { technician: string; client: string; orderId: string; address: string; status: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]">
      <div className="flex items-center justify-between"><p className="font-medium">{technician}</p><Badge className="border-blue-200 bg-blue-100 text-blue-700">{status}</Badge></div>
      <p className="text-[var(--text-secondary)]">Cliente: {client}</p>
      <p className="mono text-xs">Orden #{orderId.slice(0, 8)}</p>
      <p className="text-xs text-[var(--text-secondary)]">{address}</p>
    </div>
  );
}
