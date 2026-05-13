'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ClientsApi, EquipmentsApi, MaintenanceApi } from '@/lib/api/endpoints';
import { Client, Equipment, MaintenanceExecution, MaintenanceFrequencyType, MaintenancePlan } from '@/types/domain';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';

export default function MaintenanceSettingsPage() {
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [form, setForm] = useState<{ client_id: string; equipment_id: string; name: string; frequency_type: MaintenanceFrequencyType; next_execution_at: string }>({ client_id: '', equipment_id: '', name: '', frequency_type: 'monthly', next_execution_at: '' });
  const [executions, setExecutions] = useState<MaintenanceExecution[]>([]);

  const load = async () => {
    const [p, c, e, x] = await Promise.all([MaintenanceApi.listPlans(), ClientsApi.list(), EquipmentsApi.list(), MaintenanceApi.listExecutions()]);
    setPlans(p); setClients(c); setEquipments(e); setExecutions(x);
  };
  useEffect(() => { void load(); }, []);

  if (user?.role !== 'admin') return <p className="text-sm text-[var(--text-secondary)]">Solo administradores.</p>;

  const create = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      await MaintenanceApi.createPlan({ ...form, next_execution_at: new Date(form.next_execution_at).toISOString(), auto_generate: true, is_active: true });
      toast({ type: 'success', message: 'Plan creado' });
      setForm({ client_id: '', equipment_id: '', name: '', frequency_type: 'monthly', next_execution_at: '' });
      await load();
    } catch { toast({ type: 'error', message: 'No se pudo crear plan' }); }
  };

  return <div className="space-y-4">
    <PageHeader title="Mantenimiento preventivo" description="Planes programados con generación controlada y auditable." action={<Button onClick={async () => { const r = await MaintenanceApi.runNow(); toast({ type: 'info', message: `Ejecución: generadas ${r.generated}, omitidas ${r.skipped}, fallas ${r.failed}` }); await load(); }}>Ejecutar ahora</Button>} />
    <Card>
      <form className="grid gap-2 md:grid-cols-5" onSubmit={create}>
        <Select value={form.client_id} onChange={(e) => setForm((s) => ({ ...s, client_id: e.target.value }))}><option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}</Select>
        <Select value={form.equipment_id} onChange={(e) => setForm((s) => ({ ...s, equipment_id: e.target.value }))}><option value="">Equipo</option>{equipments.map((eq) => <option key={eq.id} value={eq.id}>{eq.numero_serie}</option>)}</Select>
        <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <Select value={form.frequency_type} onChange={(e) => setForm((s) => ({ ...s, frequency_type: e.target.value as MaintenanceFrequencyType }))}><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="semiannual">Semestral</option><option value="annual">Anual</option></Select>
        <Input type="datetime-local" value={form.next_execution_at} onChange={(e) => setForm((s) => ({ ...s, next_execution_at: e.target.value }))} />
        <div className="md:col-span-5 flex justify-end"><Button type="submit">Crear plan</Button></div>
      </form>
    </Card>
    <Card className="p-0">
      <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Plan</th><th className="p-2 text-left">Próxima ejecución</th><th className="p-2 text-left">Última ejecución</th><th className="p-2 text-left">Estado</th></tr></thead><tbody>{plans.map((p) => <tr key={p.id} className="border-t border-[var(--border)]"><td className="p-2">{p.name}<div className="mt-1 text-xs text-[var(--text-secondary)]">Órdenes generadas: {executions.filter((x) => x.plan_id === p.id && x.order_id).slice(0, 3).map((x) => x.order_id?.slice(0, 8)).join(', ') || '-'}</div></td><td className="p-2">{new Date(p.next_execution_at).toLocaleString()}</td><td className="p-2">{p.last_executed_at ? new Date(p.last_executed_at).toLocaleString() : '-'}</td><td className="p-2 space-x-2"><Button variant="secondary" onClick={async () => { await MaintenanceApi.updatePlan(p.id, { is_active: !p.is_active }); await load(); }}>{p.is_active ? 'Activo' : 'Inactivo'}</Button><Button variant="secondary" onClick={async () => { await MaintenanceApi.runPlan(p.id); await load(); }}>Ejecutar este plan</Button></td></tr>)}</tbody></table>
    </Card>
    <Card className="p-0">
      <div className="p-3 text-sm font-medium">Historial de ejecuciones</div>
      <table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Plan</th><th className="p-2 text-left">Periodo</th><th className="p-2 text-left">Estado</th><th className="p-2 text-left">Orden</th><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Error</th></tr></thead><tbody>{executions.map((x, idx) => <tr key={`${x.plan_id}-${x.execution_key}-${idx}`} className="border-t border-[var(--border)]"><td className="p-2 mono text-xs">{x.plan_id.slice(0, 8)}</td><td className="p-2">{x.execution_key}</td><td className="p-2">{x.status}</td><td className="p-2">{x.order_id ? `#${x.order_id.slice(0, 8)}` : '-'}</td><td className="p-2">{new Date(x.timestamp).toLocaleString()}</td><td className="p-2">{x.error ?? '-'}</td></tr>)}</tbody></table>
    </Card>
  </div>;
}
