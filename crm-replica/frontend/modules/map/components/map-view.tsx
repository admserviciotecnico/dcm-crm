import { ServiceOrder, User } from '@/types/domain';
import { TechnicianLocationCard } from '@/modules/map/components/technician-location-card';
import { OrderLocationCard } from '@/modules/map/components/order-location-card';

export function MapView({ orders, users }: { orders: ServiceOrder[]; users: User[] }) {
  const activeOrders = orders.filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        {activeOrders.map((order) => {
          const techId = order.technicians?.[0]?.technician_id;
          const tech = users.find((u) => u.id === techId);
          return (
            <TechnicianLocationCard
              key={order.id}
              technician={tech ? `${tech.first_name} ${tech.last_name}` : 'Sin técnico'}
              client={order.client?.nombre_empresa ?? order.client_id}
              orderId={order.id}
              address={order.direccion_service ?? 'Dirección no disponible'}
              status={order.estado}
            />
          );
        })}
      </div>
      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <h3 className="mb-3 text-lg font-medium">Vista geográfica simulada</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {activeOrders.slice(0, 8).map((order) => (
            <OrderLocationCard
              key={`map-${order.id}`}
              orderId={order.id}
              client={order.client?.nombre_empresa ?? order.client_id}
              address={order.direccion_service ?? 'Dirección no disponible'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
