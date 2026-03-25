export function buildInvoiceDraftFromOrder(order) {
  const laborHours = Number(order.tiempo_trabajado_horas ?? 0);
  const materials = (order.materials ?? []).map((material) => ({
    name: material.name,
    quantity: material.quantity,
    unit_cost: material.unit_cost,
    subtotal: Number((material.quantity * material.unit_cost).toFixed(2))
  }));
  return {
    order_id: order.id,
    client_id: order.client_id,
    labor_hours: laborHours,
    materials,
    materials_total: Number(materials.reduce((sum, material) => sum + material.subtotal, 0).toFixed(2))
  };
}
