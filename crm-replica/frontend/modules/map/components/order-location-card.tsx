import Link from 'next/link';

export function OrderLocationCard({ orderId, client, address }: { orderId: string; client: string; address: string }) {
  return (
    <Link href={`/orders/${orderId}`} className="block rounded-[8px] border border-[var(--border)] p-2 text-xs transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]">
      <p className="mono">#{orderId.slice(0, 8)}</p>
      <p className="font-medium">{client}</p>
      <p className="text-[var(--text-secondary)]">{address}</p>
    </Link>
  );
}
