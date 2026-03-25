'use client';

import { useEffect, useState } from 'react';
import { AutomationRulesApi } from '@/lib/api/endpoints';
import { AutomationRule, OrderStatus } from '@/types/domain';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { ORDER_STATUS_LABEL } from '@/constants/orderStatus';
import { getApiErrorMessage } from '@/lib/api/error-message';

const DEFAULT_FORM = {
  name: '',
  active: true,
  trigger_type: 'delayed_in_status' as const,
  target_status: 'service_programado' as OrderStatus,
  threshold_hours: 24,
  action_type: 'set_priority_alta_notify_admin' as const
};

export default function AutomationRulesPage() {
  const user = authStore((state) => state.user);
  const toast = appStore((state) => state.pushToast);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await AutomationRulesApi.list();
      setRules(data);
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron cargar las reglas') });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (user?.role !== 'admin') {
    return <p className="text-sm text-[var(--text-secondary)]">Solo administradores pueden gestionar reglas de automatización.</p>;
  }

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const submit = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await AutomationRulesApi.update(editingId, form);
        toast({ type: 'success', message: 'Regla actualizada' });
      } else {
        await AutomationRulesApi.create({ ...form, action_payload: { priority: 'alta' } });
        toast({ type: 'success', message: 'Regla creada' });
      }
      resetForm();
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar la regla') });
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const result = await AutomationRulesApi.run();
      toast({ type: 'success', message: `Automatizaciones ejecutadas. Órdenes actualizadas: ${result.totalUpdated}` });
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron ejecutar las reglas') });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Rules"
        description="Gestioná reglas admin para escalar órdenes demoradas y ejecutalas manualmente cuando lo necesites."
        action={<Button onClick={() => void runNow()} disabled={running}>{running ? 'Ejecutando…' : 'Run rules now'}</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <h2 className="text-lg font-semibold">{editingId ? 'Editar regla' : 'Nueva regla'}</h2>
          <div className="mt-4 space-y-3">
            <Input placeholder="Nombre de la regla" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Select value={form.target_status} onChange={(event) => setForm((current) => ({ ...current, target_status: event.target.value as OrderStatus }))}>
              {(Object.entries(ORDER_STATUS_LABEL) as [OrderStatus, string][]).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
            </Select>
            <Input type="number" min={1} value={form.threshold_hours} onChange={(event) => setForm((current) => ({ ...current, threshold_hours: Number(event.target.value || 0) }))} placeholder="Horas de permanencia" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              <span>Activa</span>
            </label>
            <div className="flex gap-2">
              <Button onClick={() => void submit()} disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear regla'}</Button>
              {editingId ? <Button variant="secondary" onClick={resetForm}>Cancelar</Button> : null}
            </div>
          </div>
        </Card>

        <Card className="p-0">
          <Table className="border-0">
            <thead>
              <tr>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Estado objetivo</th>
                <th className="p-3 text-left">Umbral</th>
                <th className="p-3 text-left">Activa</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-t border-[var(--border)]">
                  <td className="p-3">{rule.name}</td>
                  <td className="p-3">{ORDER_STATUS_LABEL[rule.target_status]}</td>
                  <td className="p-3">{rule.threshold_hours}h</td>
                  <td className="p-3">{rule.active ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => {
                        setEditingId(rule.id);
                        setForm({
                          name: rule.name,
                          active: rule.active,
                          trigger_type: rule.trigger_type,
                          target_status: rule.target_status,
                          threshold_hours: rule.threshold_hours,
                          action_type: rule.action_type
                        });
                      }}>Editar</Button>
                      <Button variant="secondary" onClick={() => void AutomationRulesApi.update(rule.id, { active: !rule.active }).then(load)}> {rule.active ? 'Desactivar' : 'Activar'} </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
