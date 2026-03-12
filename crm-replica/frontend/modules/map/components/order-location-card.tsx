export function OrderLocationCard({ orderId, client, address }: { orderId: string; client: string; address: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] p-2 text-xs">
      <p className="mono">#{orderId.slice(0, 8)}</p>
      <p>{client}</p>
      <p className="text-[var(--text-secondary)]">{address}</p>
    </div>
  );
}
