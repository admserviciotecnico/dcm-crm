import { ServiceOrder, User } from '@/types/domain';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { TechnicianLocationCard } from '@/modules/map/components/technician-location-card';
import { OrderLocationCard } from '@/modules/map/components/order-location-card';

export function MapView({ orders, users }: { orders: ServiceOrder[]; users: User[] }) {
  const activeOrders = orders
    .filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado')
    .sort((a, b) => Number(Boolean(b.delayed)) - Number(Boolean(a.delayed)));

  const byTechnician = users
    .filter((u) => u.role === 'tecnico')
    .map((u) => ({
      user: u,
      orders: activeOrders.filter((o) => (o.technicians ?? []).some((t) => t.technician_id === u.id))
    }))
    .filter((entry) => entry.orders.length > 0)
    .sort((a, b) => b.orders.length - a.orders.length);

  const unassigned = activeOrders.filter((o) => !(o.technicians ?? []).length);

  if (activeOrders.length === 0) {
    return <EmptyState variant="orders" title="Sin órdenes activas" subtitle="No hay trabajo en campo para mostrar en el mapa operativo." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <h3 className="mb-1 text-lg font-medium">Despacho por técnico</h3>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">Activas: {activeOrders.length} · Demoradas: {activeOrders.filter((o) => o.delayed).length} · Sin asignar: {unassigned.length}</p>
        <div className="space-y-4">
          {byTechnician.map(({ user, orders: techOrders }) => (
            <div key={user.id}>
              <p className="mb-2 text-sm font-medium">{user.first_name} {user.last_name} · {techOrders.length} orden(es)</p>
              <div className="space-y-2">
                {techOrders.map((order) => (
                  <TechnicianLocationCard
                    key={order.id}
                    technician={`${user.first_name} ${user.last_name}`}
                    client={order.client?.nombre_empresa ?? order.client_id}
                    clientId={order.client_id}
                    orderId={order.id}
                    address={order.direccion_service ?? 'Dirección no disponible'}
                    status={order.estado}
                    delayed={order.delayed}
                  />
                ))}
              </div>
            </div>
          ))}
          {unassigned.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Sin técnico asignado · {unassigned.length} orden(es)</p>
              <div className="space-y-2">
                {unassigned.map((order) => (
                  <TechnicianLocationCard
                    key={order.id}
                    technician="Sin técnico"
                    client={order.client?.nombre_empresa ?? order.client_id}
                    clientId={order.client_id}
                    orderId={order.id}
                    address={order.direccion_service ?? 'Dirección no disponible'}
                    status={order.estado}
                    delayed={order.delayed}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-medium">Ubicaciones activas</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {activeOrders.map((order) => (
            <OrderLocationCard
              key={`map-${order.id}`}
              orderId={order.id}
              client={order.client?.nombre_empresa ?? order.client_id}
              address={order.direccion_service ?? 'Dirección no disponible'}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
