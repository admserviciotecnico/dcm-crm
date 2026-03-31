'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { OrderStatusesApi } from '@/lib/api/endpoints';
import { OrderStatusConfig } from '@/types/domain';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/layout/page-header';
import { appStore } from '@/stores/app-store';
import { authStore } from '@/stores/auth-store';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { orderStatusStore } from '@/stores/order-status-store';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

type FormState = {
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  key: '',
  label: '',
  color: '#64748b',
  sort_order: 999,
  is_active: true
};

export default function OrderStatusesSettingsPage() {
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const setStoreItems = orderStatusStore((s) => s.setItems);
  const [items, setItems] = useState<OrderStatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<OrderStatusConfig | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canEditKey = useMemo(() => !editing || !editing.is_system, [editing]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await OrderStatusesApi.list();
      setItems(data);
      setStoreItems(data);
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron cargar los estados') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (user?.role !== 'admin') {
    return <p className="text-sm text-[var(--text-secondary)]">Solo administradores pueden gestionar estados de órdenes.</p>;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (item: OrderStatusConfig) => {
    setEditing(item);
    setForm({ key: item.key, label: item.label, color: item.color, sort_order: item.sort_order, is_active: item.is_active });
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!HEX_COLOR.test(form.color)) {
      toast({ type: 'error', message: 'Color inválido. Usá formato #RRGGBB' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await OrderStatusesApi.update(editing.id, {
          key: canEditKey ? form.key : undefined,
          label: form.label,
          color: form.color,
          sort_order: Number(form.sort_order),
          is_active: form.is_active
        });
        toast({ type: 'success', message: 'Estado actualizado' });
      } else {
        await OrderStatusesApi.create({
          key: form.key.trim(),
          label: form.label.trim(),
          color: form.color,
          sort_order: Number(form.sort_order),
          is_active: form.is_active
        });
        toast({ type: 'success', message: 'Estado creado' });
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar el estado') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Estados de órdenes" description="Configurá etiquetas y colores de estados sin romper el flujo operativo existente." action={<Button onClick={openCreate}>Nuevo estado</Button>} />
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-muted)] text-left">
              <th className="p-3">Etiqueta</th>
              <th className="p-3">Clave</th>
              <th className="p-3">Color</th>
              <th className="p-3">Orden</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="p-3" colSpan={7}>Cargando…</td></tr> : items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--border)]">
                <td className="p-3">{item.label}</td>
                <td className="p-3 font-mono text-xs">{item.key}</td>
                <td className="p-3">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded border border-black/20" style={{ backgroundColor: item.color }} />
                    <span>{item.color}</span>
                  </div>
                </td>
                <td className="p-3">{item.sort_order}</td>
                <td className="p-3">{item.is_active ? 'Activo' : 'Inactivo'}</td>
                <td className="p-3">{item.is_system ? 'Sistema' : 'Custom'}</td>
                <td className="p-3"><Button variant="secondary" onClick={() => openEdit(item)}>Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar estado' : 'Nuevo estado'}>
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Nombre visible</label>
            <Input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Clave interna</label>
            <Input value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.replace(/[^a-z0-9_]/g, '_') }))} required disabled={!canEditKey} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Color (#RRGGBB)</label>
            <div className="flex items-center gap-2">
              <Input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} required />
              <span className="inline-block h-8 w-8 rounded border border-black/20" style={{ backgroundColor: HEX_COLOR.test(form.color) ? form.color : '#64748b' }} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">Orden</label>
            <Input type="number" min={0} value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value || 0) }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            <span>Activo</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
