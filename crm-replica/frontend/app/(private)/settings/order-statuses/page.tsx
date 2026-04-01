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
const PRESET_GROUPS = [
  { name: 'Neutros', colors: ['#64748b', '#6b7280', '#475569'] },
  { name: 'Fríos', colors: ['#3b82f6', '#06b6d4', '#10b981', '#8b5cf6'] },
  { name: 'Cálidos', colors: ['#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899'] }
] as const;

const COLOR_NAME_BY_HEX: Record<string, string> = {
  '#64748b': 'Pizarra',
  '#6b7280': 'Gris',
  '#475569': 'Pizarra',
  '#3b82f6': 'Azul',
  '#06b6d4': 'Cian',
  '#10b981': 'Verde',
  '#8b5cf6': 'Violeta',
  '#84cc16': 'Lima',
  '#eab308': 'Amarillo',
  '#f59e0b': 'Ámbar',
  '#f97316': 'Naranja',
  '#ef4444': 'Rojo',
  '#ec4899': 'Rosa'
};

function isColorTooLight(hex: string) {
  if (!HEX_COLOR.test(hex)) return false;
  const raw = hex.replace('#', '');
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 180;
}

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

  const pickerColor = HEX_COLOR.test(form.color) ? form.color : '#64748b';
  const tooLight = isColorTooLight(pickerColor);
  const selectedColorName = COLOR_NAME_BY_HEX[pickerColor.toLowerCase()] ?? 'Personalizado';

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
              <input
                type="color"
                value={pickerColor}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value.toLowerCase() }))}
                className="h-10 w-14 cursor-pointer rounded border border-[var(--border)] bg-transparent p-1"
                aria-label="Seleccionar color"
              />
              <Input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} required />
              <span className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${tooLight ? 'border-red-400/60 bg-red-500/10 text-red-300' : ''}`} style={tooLight ? undefined : { backgroundColor: `${pickerColor}22`, borderColor: `${pickerColor}66`, color: pickerColor }}>Vista previa</span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">Color seleccionado: <span className="font-medium text-[var(--text-primary)]">{selectedColorName}</span></p>
            {tooLight ? <p className="mt-1 text-xs text-red-300">Elegí un color más oscuro para asegurar legibilidad</p> : null}
            <div className="mt-2 space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">Colores sugeridos</p>
              {PRESET_GROUPS.map((group) => (
                <div key={group.name}>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">{group.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.colors.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, color: preset }))}
                        className={`h-6 w-6 rounded-full border border-white/20 ${pickerColor.toLowerCase() === preset ? 'ring-2 ring-offset-1 ring-offset-[var(--bg-surface)] ring-blue-500' : ''}`}
                        style={{ backgroundColor: preset }}
                        aria-label={`Usar color ${preset}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
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
            <Button type="submit" disabled={saving || tooLight}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
