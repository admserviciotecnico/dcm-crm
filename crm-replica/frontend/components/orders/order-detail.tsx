'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Download, ExternalLink, MapPin, PackagePlus, Save, Trash2, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { EventLog, ExternalCalendarEventStatus, InvoiceDraft, OrderHistory, OrderMaterial, ServiceOrder, User } from '@/types/domain';
import { CalendarIntegrationsApi, EventsApi, FailuresApi, OrdersApi } from '@/lib/api/endpoints';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { SlaBadge } from '@/components/common/sla-badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { getSocket } from '@/lib/api/socket';
import { RelativeTime } from '@/components/common/relative-time';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';
import { FileUploader } from '@/modules/documents/components/file-uploader';
import { FileList } from '@/modules/documents/components/file-list';
import { useDocumentsState } from '@/modules/documents/hooks/use-documents-state';
import { resolveActorName, resolveActorNameById } from '@/lib/actor-name';
import { ORDER_STATUS_COLUMNS, ORDER_STATUS_WORKFLOW } from '@/constants/orderStatus';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { getOrderHistoryFieldLabel } from '@/lib/order-history';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { orderStatusStore } from '@/stores/order-status-store';

type LocalComment = { id: string; user: string; message: string; time: string };
type CommentForm = { comment: string };
type MaterialForm = { name: string; quantity: number; unit_cost: number };
type ClosureForm = {
  tiempo_trabajado_horas: number;
  observaciones_cierre: string;
  firma_cliente: string;
  foto_trabajo_url: string;
  trabajo_realizado: boolean;
  area_limpia: boolean;
  equipo_probado: boolean;
  documentacion_entregada: boolean;
  failure_type: string;
  failure_category: string;
  root_cause: string;
  solution: string;
  resolution_type: 'remote' | 'onsite' | 'replacement';
};

const DEFAULT_MATERIAL: MaterialForm = { name: '', quantity: 1, unit_cost: 0 };
const DEFAULT_CLOSURE: ClosureForm = {
  tiempo_trabajado_horas: 0,
  observaciones_cierre: '',
  firma_cliente: '',
  foto_trabajo_url: '',
  trabajo_realizado: false,
  area_limpia: false,
  equipo_probado: false,
  documentacion_entregada: false
  ,failure_type: '',
  failure_category: '',
  root_cause: '',
  solution: '',
  resolution_type: 'onsite'
};
const WARRANTY_LABELS: Record<string, string> = {
  unknown: 'Sin evaluar',
  pending_review: '🟡 Pendiente',
  approved: '🟢 En garantía',
  rejected: '🔴 Fuera de garantía'
};

function buildDownloadUrl(blob: Blob) {
  return window.URL.createObjectURL(blob);
}

function materialTotal(materials: OrderMaterial[]) {
  return materials.reduce((sum, material) => sum + (material.quantity * material.unit_cost), 0);
}

export function OrderDetail({ order, users, onClose, onRefresh }: { order: ServiceOrder | null; users: User[]; onClose: () => void; onRefresh: () => void }) {
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [backendEvents, setBackendEvents] = useState<EventLog[]>([]);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [initialTechnicians, setInitialTechnicians] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [materials, setMaterials] = useState<OrderMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<OrderMaterial | null>(null);
  const [locationEvents, setLocationEvents] = useState(order?.location_events ?? []);
  const [calendarStatuses, setCalendarStatuses] = useState<ExternalCalendarEventStatus[]>([]);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft | null>(order?.invoice_draft ?? null);
  const [invoiceDraftLoading, setInvoiceDraftLoading] = useState(false);
  const [locationSaving, setLocationSaving] = useState<'arrival' | 'departure' | null>(null);
  const [closureSaving, setClosureSaving] = useState(false);
  const [warrantySaving, setWarrantySaving] = useState(false);
  const [failureCatalog, setFailureCatalog] = useState<Array<{ id: string; failure_type: string; failure_category: string; common_root_cause: string; recommended_solution: string }>>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [backendEventsError, setBackendEventsError] = useState<string | null>(null);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [locationEventsError, setLocationEventsError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const labelFor = orderStatusStore((s) => s.labelFor);
  const online = useOnlineStatus();
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<CommentForm>({ defaultValues: { comment: '' } });
  const materialForm = useForm<MaterialForm>({ defaultValues: DEFAULT_MATERIAL });
  const closureForm = useForm<ClosureForm>({ defaultValues: DEFAULT_CLOSURE });
  const { docs, status: docsStatus, add: addDocument, remove: removeDocument } = useDocumentsState('order', order?.id ?? '');

  useEffect(() => {
    if (!order) return;
    OrdersApi.history(order.id).then((data) => {
      setHistory(data);
      setHistoryError(null);
    }).catch((error) => {
      setHistory([]);
      setHistoryError(getApiErrorMessage(error, 'No se pudo cargar el historial de la orden'));
    });
    EventsApi.list({ entityType: 'order', entityId: order.id, limit: 200 }).then((data) => {
      setBackendEvents(data);
      setBackendEventsError(null);
    }).catch((error) => {
      setBackendEvents([]);
      setBackendEventsError(getApiErrorMessage(error, 'No se pudo cargar la actividad operativa'));
    });
    setMaterialsLoading(true);
    setMaterialsError(null);
    OrdersApi.materials(order.id)
      .then((data) => {
        setMaterials(data);
        setMaterialsError(null);
      })
      .catch((error) => {
        setMaterials([]);
        setMaterialsError(getApiErrorMessage(error, 'No se pudieron cargar los materiales'));
      })
      .finally(() => setMaterialsLoading(false));
    OrdersApi.locationEvents(order.id).then((data) => {
      setLocationEvents(data);
      setLocationEventsError(null);
    }).catch((error) => {
      setLocationEvents(order.location_events ?? []);
      setLocationEventsError(getApiErrorMessage(error, 'No se pudieron cargar los eventos de ubicación'));
    });
    CalendarIntegrationsApi.orderStatus(order.id).then((data) => {
      setCalendarStatuses(data);
      setCalendarError(null);
    }).catch((error) => {
      setCalendarStatuses([]);
      setCalendarError(getApiErrorMessage(error, 'No se pudo cargar el estado de sincronización de calendario'));
    });
    setInvoiceDraft(order.invoice_draft ?? null);
    const ids = (order.technicians ?? []).map((t) => t.technician_id);
    setSelectedTechnicians(ids);
    setInitialTechnicians(ids);
    reset({ comment: '' });
    materialForm.reset(DEFAULT_MATERIAL);
    if (!closureForm.formState.isDirty) {
      closureForm.reset({
        tiempo_trabajado_horas: order.tiempo_trabajado_horas ?? 0,
        observaciones_cierre: order.observaciones_cierre ?? '',
        firma_cliente: order.firma_cliente ?? '',
        foto_trabajo_url: order.foto_trabajo_url ?? '',
        trabajo_realizado: Boolean(order.checklist_cierre?.trabajo_realizado),
        area_limpia: Boolean(order.checklist_cierre?.area_limpia),
        equipo_probado: Boolean(order.checklist_cierre?.equipo_probado),
        documentacion_entregada: Boolean(order.checklist_cierre?.documentacion_entregada)
        ,failure_type: order.failure_type ?? '',
        failure_category: order.failure_category ?? '',
        root_cause: order.root_cause ?? '',
        solution: order.solution ?? '',
        resolution_type: (order.resolution_type ?? 'onsite') as 'remote' | 'onsite' | 'replacement'
      });
    }
    setEditingMaterial(null);
    setMaterialModalOpen(false);
    FailuresApi.catalog().then(setFailureCatalog).catch(() => setFailureCatalog([]));
  }, [closureForm, materialForm, order, reset]);

  useEffect(() => {
    const socket = getSocket();
    const onRemoteComment = (payload: { orderId: string; message: string; user: string }) => {
      if (!order || payload.orderId !== order.id) return;
      setComments((prev) => [...prev, { id: crypto.randomUUID(), user: payload.user, message: payload.message, time: new Date().toISOString() }]);
    };
    socket.on('orders:comment', onRemoteComment);
    return () => { socket.off('orders:comment', onRemoteComment); };
  }, [order]);

  const adminAllowed = useMemo(() => {
    if (!order) return [];
    if (ORDER_STATUS_COLUMNS.includes(order.estado as typeof ORDER_STATUS_COLUMNS[number])) {
      return ORDER_STATUS_WORKFLOW[order.estado as keyof typeof ORDER_STATUS_WORKFLOW] ?? [];
    }
    return [];
  }, [order]);
  const techUsers = users.filter((u) => u.role === 'tecnico');
  const usersById = useMemo(() => new Map(users.map((listedUser) => [listedUser.id, listedUser])), [users]);
  const timelineEvents = history.map((h) => ({ id: h.id, actor: resolveActorName(h.usuario), action: `cambió ${getOrderHistoryFieldLabel(h.campo_modificado)}`, entity: `${h.valor_nuevo ?? '-'}`, at: h.created_at }));
  const backendTimelineEvents = backendEvents.map((event) => ({
    id: event.id,
    actor: resolveActorNameById(event.actor_user_id, usersById),
    action: event.event_type.replace('_', ' '),
    entity: event.message,
    at: event.created_at,
    href: event.entity_type === 'order' && event.entity_id ? `/orders/${event.entity_id}` : undefined
  }));

  if (!order) return null;

  const techName = (id: string) => {
    const tech = users.find((u) => u.id === id);
    return tech ? `${tech.first_name} ${tech.last_name}` : id;
  };

  const isOperationalReadOnly = order.estado === 'cancelado' || order.estado === 'completado';
  const visibleAdminTransitions = adminAllowed.filter((next) => next !== 'cancelado');
  const canTechMove = user?.role === 'tecnico' && !isOperationalReadOnly && (order.estado === 'service_programado' || order.estado === 'en_ejecucion');
  const canCancel = user?.role === 'admin' && adminAllowed.includes('cancelado');
  const canManageMaterials = !isOperationalReadOnly && (user?.role === 'admin' || user?.role === 'tecnico');
  const canRegisterLocation = user?.role === 'tecnico' && (order.estado === 'service_programado' || order.estado === 'en_ejecucion');
  const canEditClosure = !isOperationalReadOnly && (user?.role === 'admin' || user?.role === 'tecnico');
  const canReassignTechnicians = user?.role === 'admin' && !isOperationalReadOnly;
  const reassignmentDirty = [...selectedTechnicians].sort().join(',') !== [...initialTechnicians].sort().join(',');
  const recentHistory = history.slice(0, 5);
  const materialsCost = materialTotal(materials);
  const closureChecklist = order.checklist_cierre ? Object.entries(order.checklist_cierre) : [];
  const latestArrival = locationEvents.find((event) => event.event_type === 'arrival');
  const latestDeparture = locationEvents.find((event) => event.event_type === 'departure');
  const canGenerateInvoiceDraft = user?.role === 'admin' && order.estado === 'completado';
  const canRetryCalendarSync = user?.role === 'admin';
  const closureDirty = closureForm.formState.isDirty;
  const materialDraftDirty = materialModalOpen && (materialForm.formState.isDirty || editingMaterial !== null);

  const requestClose = () => {
    if (isDirty || reassignmentDirty || closureDirty || materialDraftDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  const handleExportPdf = async () => {
    try {
      const blob = await OrdersApi.exportPdf(order.id);
      const url = buildDownloadUrl(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `service-order-${order.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ type: 'success', message: 'PDF descargado correctamente' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo exportar el PDF') });
    }
  };

  const handleGenerateInvoiceDraft = async () => {
    setInvoiceDraftLoading(true);
    try {
      const created = await OrdersApi.createInvoiceDraft(order.id, { labor_rate: 0 });
      setInvoiceDraft(created);
      toast({ type: 'success', message: 'Borrador de factura generado' });
      onRefresh();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo generar el borrador de factura') });
    } finally {
      setInvoiceDraftLoading(false);
    }
  };

  const retryCalendarSync = async () => {
    if (!canRetryCalendarSync) return;
    setCalendarSyncing(true);
    try {
      const result = await CalendarIntegrationsApi.syncOrderNow(order.id);
      const statuses = await CalendarIntegrationsApi.orderStatus(order.id);
      setCalendarStatuses(statuses);
      toast({ type: 'success', message: `Sincronización ejecutada. Actualizados: ${result.synced}, errores: ${result.errors}` });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo sincronizar el calendario externo') });
    } finally {
      setCalendarSyncing(false);
    }
  };

  const saveClosure = closureForm.handleSubmit(async (values) => {
    setClosureSaving(true);
    try {
      await OrdersApi.patch(order.id, {
        tiempo_trabajado_horas: values.tiempo_trabajado_horas,
        observaciones_cierre: values.observaciones_cierre,
        firma_cliente: values.firma_cliente,
        foto_trabajo_url: values.foto_trabajo_url,
        checklist_cierre: {
          trabajo_realizado: values.trabajo_realizado,
          area_limpia: values.area_limpia,
          equipo_probado: values.equipo_probado,
          documentacion_entregada: values.documentacion_entregada
        },
        failure_type: values.failure_type,
        failure_category: values.failure_category,
        root_cause: values.root_cause,
        solution: values.solution,
        resolution_type: values.resolution_type
      });
      toast({ type: 'success', message: 'Cierre técnico actualizado' });
      onRefresh();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar el cierre técnico') });
    } finally {
      setClosureSaving(false);
    }
  });

  const registerLocationEvent = async (eventType: 'arrival' | 'departure') => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({ type: 'error', message: 'Geolocalización no disponible en este dispositivo' });
      return;
    }

    setLocationSaving(eventType);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const created = await OrdersApi.recordLocationEvent(order.id, {
          event_type: eventType,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationEvents((prev) => [created, ...prev]);
        toast({ type: 'success', message: eventType === 'arrival' ? 'Llegada registrada' : 'Salida registrada' });
      } catch (error) {
        toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo registrar la ubicación') });
      } finally {
        setLocationSaving(null);
      }
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED ? 'Permiso de ubicación denegado. Habilítalo para registrar llegada o salida.' : 'No se pudo obtener tu ubicación actual';
      toast({ type: 'error', message });
      setLocationSaving(null);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  const openNewMaterialModal = () => {
    setEditingMaterial(null);
    materialForm.reset(DEFAULT_MATERIAL);
    setMaterialModalOpen(true);
  };

  const openEditMaterialModal = (material: OrderMaterial) => {
    setEditingMaterial(material);
    materialForm.reset({ name: material.name, quantity: material.quantity, unit_cost: material.unit_cost });
    setMaterialModalOpen(true);
  };

  const saveMaterial = materialForm.handleSubmit(async (values) => {
    if (!order) return;
    setMaterialSaving(true);
    try {
      if (editingMaterial) {
        const updated = await OrdersApi.updateMaterial(order.id, editingMaterial.id, values);
        setMaterials((prev) => prev.map((material) => material.id === updated.id ? updated : material));
        toast({ type: 'success', message: 'Material actualizado' });
      } else {
        const created = await OrdersApi.addMaterial(order.id, values);
        setMaterials((prev) => [created, ...prev]);
        toast({ type: 'success', message: 'Material agregado' });
      }
      setMaterialModalOpen(false);
      setEditingMaterial(null);
      materialForm.reset(DEFAULT_MATERIAL);
      onRefresh();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar el material') });
    } finally {
      setMaterialSaving(false);
    }
  });

  const deleteMaterial = async (material: OrderMaterial) => {
    try {
      await OrdersApi.removeMaterial(order.id, material.id);
      setMaterials((prev) => prev.filter((item) => item.id !== material.id));
      toast({ type: 'info', message: 'Material eliminado' });
      onRefresh();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo eliminar el material') });
    }
  };

  const evaluateWarranty = async (decision: 'approved' | 'rejected') => {
    if (!order || user?.role !== 'admin') return;
    setWarrantySaving(true);
    try {
      await OrdersApi.patch(order.id, {
        warranty_status: decision,
        coverage: decision === 'approved' ? 'partial' : 'none'
      });
      toast({ type: 'success', message: `Garantía ${decision === 'approved' ? 'aprobada' : 'rechazada'}` });
      onRefresh();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo actualizar la garantía') });
    } finally {
      setWarrantySaving(false);
    }
  };
  const startWarrantyReview = async () => {
    if (!order || user?.role !== 'admin') return;
    setWarrantySaving(true);
    try {
      await OrdersApi.patch(order.id, { warranty_status: 'pending_review' });
      toast({ type: 'success', message: 'Garantía en revisión' });
      onRefresh();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo iniciar revisión de garantía') });
    } finally {
      setWarrantySaving(false);
    }
  };

  return (
    <ErrorBoundary>
      <>
        <Drawer open={!!order} title={`Orden #${order.id.slice(0, 8)}`} onClose={requestClose}>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge value={order.estado} />
                <PriorityBadge value={order.prioridad} />
                <SlaBadge status={order.sla_status} slaDeadline={order.sla_deadline} />
                <Badge className={order.billable ? 'border-red-400 bg-red-500/15 text-red-300' : order.warranty_covered ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : 'border-[var(--border)]'}>
                  {order.billable ? '💰 Facturable' : order.warranty_covered ? '🛠 En garantía' : 'Garantía sin definir'}
                </Badge>
                {order.ticket_id ? <Badge className="border-sky-400 bg-sky-500/10 text-sky-300">Desde ticket #{order.ticket_id.slice(0, 8)}</Badge> : null}
                {order.maintenance_plan_id ? <Badge className="border-sky-400 bg-sky-500/15 text-sky-300">🟦 Preventivo</Badge> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={handleExportPdf}><Download size={16} /> PDF</Button>
                {canGenerateInvoiceDraft ? <Button variant="secondary" onClick={handleGenerateInvoiceDraft} disabled={invoiceDraftLoading}>{invoiceDraftLoading ? 'Generando…' : invoiceDraft ? 'Ver borrador generado' : 'Generar borrador de factura'}</Button> : null}
                <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm text-cyan-300">
                  <ExternalLink size={14} /> Abrir página
                </Link>
              </div>
            </div>
            {!online && user?.role === 'tecnico' ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-amber-200 bg-amber-100 px-3 py-2 text-sm text-amber-800">
                <WifiOff size={16} /> Estás offline. Podés revisar la orden ya sincronizada, pero algunas acciones en vivo quedarán limitadas.
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[var(--text-secondary)]">Cliente</p>
                <p>{order.client?.nombre_empresa ?? order.client_id}</p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Dirección</p>
                <p>{order.direccion_service ?? '-'}</p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Fecha</p>
                <p><RelativeTime value={order.fecha_programada} /></p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Técnicos</p>
                <div className="space-y-1">{(order.technicians ?? []).map((t) => <div key={t.technician_id} className="flex items-center gap-2"><Avatar name={techName(t.technician_id)} /><span>{techName(t.technician_id)}</span></div>)}</div>{canReassignTechnicians ? <Button className="mt-2" variant="secondary" onClick={() => setReassignOpen(true)}>Reasignar técnicos</Button> : null}
              </div>
            </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">Catálogo de fallas (opcional)</label>
                    <Select value="" onChange={(event: any) => {
                      const item = failureCatalog.find((row) => row.id === event.target.value);
                      if (!item) return;
                      closureForm.setValue('failure_type', item.failure_type, { shouldDirty: true });
                      closureForm.setValue('failure_category', item.failure_category, { shouldDirty: true });
                      closureForm.setValue('root_cause', item.common_root_cause, { shouldDirty: true });
                      closureForm.setValue('solution', item.recommended_solution, { shouldDirty: true });
                    }}>
                      <option value="">Seleccionar</option>
                      {failureCatalog.map((item) => <option key={item.id} value={item.id}>{item.failure_type} · {item.failure_category}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">Tipo de falla</label>
                    <Input disabled={!canEditClosure} {...closureForm.register('failure_type')} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">Categoría</label>
                    <Input disabled={!canEditClosure} {...closureForm.register('failure_category')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">Causa raíz</label>
                    <textarea disabled={!canEditClosure} className="min-h-20 w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm" {...closureForm.register('root_cause')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">Solución</label>
                    <textarea disabled={!canEditClosure} className="min-h-20 w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm" {...closureForm.register('solution')} />
                  </div>
              <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
                <p className="text-[var(--text-secondary)]">Garantía</p>
                <div className="mt-2 space-y-1">
                  <p><span className="font-medium">Estado:</span> {WARRANTY_LABELS[order.warranty_status ?? 'unknown'] ?? order.warranty_status}</p>
                  <p><span className="font-medium">Cobertura:</span> {order.coverage ?? 'none'}</p>
                  <p><span className="font-medium">Motivo:</span> {order.warranty_reason || '-'}</p>
                  <p><span className="font-medium">Notas internas:</span> {order.warranty_notes || '-'}</p>
                </div>
                {order.warranty_mismatch ? <p className="mt-2 rounded-[8px] border border-amber-400 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">⚠ La garantía difiere del ticket original</p> : null}
                {user?.role === 'admin' ? (
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" disabled={warrantySaving || order.warranty_status !== 'unknown'} onClick={() => void startWarrantyReview()}>Evaluar garantía</Button>
                    <Button variant="secondary" disabled={warrantySaving || order.warranty_status !== 'pending_review'} onClick={() => void evaluateWarranty('approved')}>Aprobar</Button>
                    <Button variant="danger" disabled={warrantySaving || order.warranty_status !== 'pending_review'} onClick={() => void evaluateWarranty('rejected')}>Rechazar</Button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
                <p className="text-[var(--text-secondary)]">Cierre de servicio</p>
                <div className="mt-2 space-y-1">
                  <p><span className="font-medium">Horas trabajadas:</span> {order.tiempo_trabajado_horas ?? '-'}</p>
                  <p><span className="font-medium">Firma cliente:</span> {order.firma_cliente || '-'}</p>
                  <p><span className="font-medium">Foto trabajo:</span> {order.foto_trabajo_url ? <a href={order.foto_trabajo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Ver foto</a> : '-'}</p>
                  <p><span className="font-medium">Observaciones cierre:</span> {order.observaciones_cierre || '-'}</p>
                </div>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
                <p className="text-[var(--text-secondary)]">Checklist de cierre</p>
                <div className="mt-2 space-y-1">
                  {closureChecklist.length === 0 ? <p className="text-[var(--text-muted)]">Sin checklist registrado.</p> : closureChecklist.map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-surface-hover)] px-2 py-1">
                      <span>{key.replace(/_/g, ' ')}</span>
                      <span className={value ? 'text-emerald-600' : 'text-amber-600'}>{value ? 'Sí' : 'No'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {invoiceDraft ? (
              <div className="rounded-[10px] border border-amber-300 bg-amber-100 p-3 text-sm text-amber-950">
                <p className="font-semibold">Borrador de factura</p>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <p><span className="font-medium">Horas:</span> {invoiceDraft.labor_hours}</p>
                  <p><span className="font-medium">Mano de obra:</span> {invoiceDraft.currency} {invoiceDraft.labor_amount.toFixed(2)}</p>
                  <p><span className="font-medium">Materiales:</span> {invoiceDraft.currency} {invoiceDraft.materials_amount.toFixed(2)}</p>
                  <p><span className="font-medium">Total:</span> {invoiceDraft.currency} {invoiceDraft.total_amount.toFixed(2)}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Calendar sync</p>
                  <p className="text-[var(--text-secondary)]">
                    {calendarStatuses.length === 0
                      ? 'Sin eventos sincronizados para esta orden'
                      : `${calendarStatuses.length} vínculo(s) de calendario`}
                  </p>
                </div>
                {canRetryCalendarSync ? (
                  <Button variant="secondary" onClick={() => void retryCalendarSync()} disabled={calendarSyncing}>
                    {calendarSyncing ? 'Sincronizando…' : 'Reintentar sincronización'}
                  </Button>
                ) : null}
              </div>
              {calendarStatuses.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {calendarStatuses.map((status) => (
                    <p key={status.id} className="text-xs">
                      {status.provider.toUpperCase()} · usuario {status.user_id.slice(0, 8)} · {status.sync_status}
                      {status.last_error ? ` · ${status.last_error}` : ''}
                    </p>
                  ))}
                </div>
              ) : null}
              {calendarError ? <p className="mt-2 text-xs text-red-300">{calendarError}</p> : null}
            </div>

            <div className="rounded-[10px] border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Geolocalización de servicio</p>
                  <p className="text-sm font-medium">Llegada: {latestArrival ? new Date(latestArrival.created_at).toLocaleString() : 'pendiente'} · Salida: {latestDeparture ? new Date(latestDeparture.created_at).toLocaleString() : 'pendiente'}</p>
                </div>
                {canRegisterLocation ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="min-h-10" disabled={!online || locationSaving !== null} onClick={() => void registerLocationEvent('arrival')}>
                      <MapPin size={16} /> {locationSaving === 'arrival' ? 'Registrando...' : 'Registrar llegada'}
                    </Button>
                    <Button variant="secondary" className="min-h-10" disabled={!online || locationSaving !== null} onClick={() => void registerLocationEvent('departure')}>
                      <MapPin size={16} /> {locationSaving === 'departure' ? 'Registrando...' : 'Registrar salida'}
                    </Button>
                  </div>
                ) : null}
              </div>
              {locationEvents.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {locationEvents.slice(0, 4).map((event) => (
                    <div key={event.id} className="rounded-md bg-[var(--bg-surface-hover)] px-3 py-2 text-sm">
                      <p className="font-medium">{event.event_type === 'arrival' ? 'Llegada registrada' : 'Salida registrada'}</p>
                      <p className="text-[var(--text-secondary)]">{new Date(event.created_at).toLocaleString()} · {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Todavía no hay eventos de llegada o salida registrados.</p>
              )}
              {locationEventsError ? <p className="mt-2 text-xs text-red-300">{locationEventsError}</p> : null}
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">Acciones de workflow</p>
              <div className="flex flex-wrap gap-2">
                {user?.role === 'admin' ? visibleAdminTransitions.map((next) => <Button key={next} variant="secondary" onClick={async () => { try { await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Estado actualizado a ${next}` }); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo actualizar el estado' }); } }}>{labelFor(next)}</Button>) : null}
                {canTechMove ? <Button variant="secondary" onClick={async () => { const next = order.estado === 'service_programado' ? 'en_ejecucion' : 'completado'; try { await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Orden ${next}` }); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo actualizar la orden' }); } }}>{labelFor(order.estado === 'service_programado' ? 'en_ejecucion' : 'completado')}</Button> : null}
                {canCancel ? <Button variant="danger" onClick={() => setConfirmCancel(true)}>{labelFor('cancelado')}</Button> : null}
              </div>
            </div>

            <div className="rounded-[10px] border border-[var(--border)] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Materiales</p>
                  <p className="text-sm font-medium">{materials.length} items · ${materialsCost.toFixed(2)}</p>
                </div>
                {canManageMaterials ? <Button variant="secondary" onClick={openNewMaterialModal}><PackagePlus size={16} /> Agregar material</Button> : null}
              </div>
              {materialsLoading ? <p className="text-sm text-[var(--text-secondary)]">Cargando materiales...</p> : null}
              {!materialsLoading && materials.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Todavía no hay materiales cargados.</p> : null}
              {materialsError ? <p className="mb-2 text-xs text-red-300">{materialsError}</p> : null}
              <div className="space-y-2">
                {materials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3 text-sm">
                    <div>
                      <p className="font-medium">{material.name}</p>
                      <p className="text-[var(--text-secondary)]">{material.quantity} × ${material.unit_cost.toFixed(2)} · Total ${(material.quantity * material.unit_cost).toFixed(2)}</p>
                    </div>
                    {canManageMaterials ? (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => openEditMaterialModal(material)}>Editar</Button>
                        <Button variant="ghost" onClick={() => void deleteMaterial(material)}><Trash2 size={16} /></Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[10px] border border-[var(--border)] p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Cierre técnico estructurado</p>
                  <p className="text-sm font-medium">Completá horas, checklist y evidencias sin depender de texto libre.</p>
                </div>
                {canEditClosure ? (
                  <Button variant="secondary" className="min-h-10" disabled={closureSaving || !online} onClick={() => void saveClosure()}>
                    <Save size={16} /> {closureSaving ? 'Guardando...' : 'Guardar cierre'}
                  </Button>
                ) : null}
              </div>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={saveClosure}>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-secondary)]">Horas trabajadas</label>
                  <Input type="number" min="0" step="0.5" disabled={!canEditClosure} {...closureForm.register('tiempo_trabajado_horas', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-secondary)]">Firma cliente</label>
                  <Input placeholder="Nombre o referencia de firma" disabled={!canEditClosure} {...closureForm.register('firma_cliente')} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-[var(--text-secondary)]">Foto / evidencia URL</label>
                  <Input placeholder="https://... o referencia interna" disabled={!canEditClosure} {...closureForm.register('foto_trabajo_url')} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-[var(--text-secondary)]">Observaciones de cierre</label>
                  <textarea disabled={!canEditClosure} className="min-h-24 w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-70" {...closureForm.register('observaciones_cierre')} />
                </div>
                <div className="md:col-span-2">
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">Checklist</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['trabajo_realizado', 'Trabajo realizado'],
                      ['area_limpia', 'Área limpia'],
                      ['equipo_probado', 'Equipo probado'],
                      ['documentacion_entregada', 'Documentación entregada']
                    ].map(([field, label]) => (
                      <label key={field} className="flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--border)] px-3 py-2 text-sm">
                        <input type="checkbox" disabled={!canEditClosure} {...closureForm.register(field as keyof ClosureForm)} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
              {!canEditClosure ? <p className="mt-2 text-xs text-[var(--text-secondary)]">La orden está en modo solo lectura para cierre técnico.</p> : null}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">Auditoría reciente</p>
                <Link href={`/orders/${order.id}`} className="text-sm text-cyan-300">Ver historial completo →</Link>
              </div>
              {historyError ? <p className="mb-2 text-xs text-red-300">{historyError}</p> : null}
              {backendEventsError ? <p className="mb-2 text-xs text-red-300">{backendEventsError}</p> : null}
              <Timeline>
                {recentHistory.map((h) => <TimelineItem key={h.id} title={`${resolveActorName(h.usuario)} · ${getOrderHistoryFieldLabel(h.campo_modificado)}`} subtitle={`${h.valor_anterior ?? '-'} → ${h.valor_nuevo ?? '-'} · ${new Date(h.created_at).toLocaleString()}`} />)}
              </Timeline>
              <div className="mt-3">
                <ActivityTimeline events={backendTimelineEvents.length > 0 ? backendTimelineEvents : timelineEvents} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">Comentarios del equipo</p>
              <div className="space-y-2">{comments.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Sin comentarios aún. Sé el primero en comentar.</p> : comments.map((c) => <div key={c.id} className="rounded-lg border border-[var(--border)] p-2 text-sm"><div className="flex items-center gap-2"><Avatar name={c.user} className="h-6 w-6" /><p className="font-medium">{c.user}</p><span className="text-xs text-[var(--text-secondary)]"><RelativeTime value={c.time} /></span></div><p className="mt-1 text-[var(--text-primary)]">{c.message}</p></div>)}</div>
              <form className="mt-2 flex gap-2" onSubmit={handleSubmit(async ({ comment }) => { if (!comment.trim()) return; const payload = { id: crypto.randomUUID(), user: `${user?.first_name ?? 'Operador'} ${user?.last_name ?? ''}`.trim(), message: comment, time: new Date().toISOString() }; setComments((v) => [...v, payload]); getSocket().emit('orders:comment', { orderId: order.id, ...payload }); reset({ comment: '' }); })}>
                <input {...register('comment')} className="h-9 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]" placeholder="Escribir comentario interno..." />
                <Button type="submit">Enviar</Button>
              </form>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">Archivos adjuntos</p>
              {docsStatus === 'forbidden' ? <p className="mb-2 text-xs text-red-300">No tenés permisos para acceder a documentos de esta orden.</p> : null}
              <FileUploader
                allowCapture
                defaultCategory="photo"
                onAdd={async (name, category) => {
                  const result = await addDocument(name, category);
                  if (result.ok) toast({ type: 'success', message: 'Documento agregado' });
                  else if (result.reason === 'duplicate') toast({ type: 'info', message: 'Ese documento ya existe para esta orden' });
                  else if (result.reason === 'invalid') toast({ type: 'error', message: 'Nombre de documento inválido' });
                  else toast({ type: 'error', message: 'No se pudo registrar el documento' });
                }}
                onAddFile={async (file, category) => {
                  const result = await addDocument(file.name, category, { filePath: `capture://${file.name}` });
                  if (result.ok) toast({ type: 'success', message: 'Foto asociada a la orden' });
                  else if (result.reason === 'duplicate') toast({ type: 'info', message: 'Esa foto ya está registrada para esta orden' });
                  else toast({ type: 'error', message: 'No se pudo registrar la foto' });
                }}
              />
              <p className="mt-2 text-xs text-[var(--text-secondary)]">Las fotos capturadas hoy se guardan como evidencia registrada dentro del sistema de documentos. El binario real seguirá dependiendo de la futura capa de upload físico.</p>
              {docsStatus === 'forbidden' ? null : <div className="mt-2"><FileList docs={docs} onRemove={async (id) => { const result = await removeDocument(id); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} /></div>}
            </div>
          </div>
        </Drawer>

        <Modal open={materialModalOpen} title={editingMaterial ? 'Editar material' : 'Agregar material'} onClose={() => { if (!materialSaving) setMaterialModalOpen(false); }}>
          <form className="space-y-3" onSubmit={saveMaterial}>
            <Input placeholder="Nombre del material" {...materialForm.register('name')} />
            <Input type="number" min="0.01" step="0.01" placeholder="Cantidad" {...materialForm.register('quantity', { valueAsNumber: true })} />
            <Input type="number" min="0" step="0.01" placeholder="Costo unitario" {...materialForm.register('unit_cost', { valueAsNumber: true })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMaterialModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={materialSaving}>{materialSaving ? 'Guardando...' : 'Guardar material'}</Button>
            </div>
          </form>
        </Modal>

        <Modal open={reassignOpen} title="Reasignar técnicos" onClose={() => setReassignOpen(false)}>
          <div className="space-y-2">
            {techUsers.map((tech) => {
              const checked = selectedTechnicians.includes(tech.id);
              return (
                <label key={tech.id} className="flex items-center gap-2 rounded border border-[var(--border)] p-2 text-sm">
                  <input type="checkbox" checked={checked} onChange={() => setSelectedTechnicians((prev) => checked ? prev.filter((id) => id !== tech.id) : [...prev, tech.id])} />
                  <span>{tech.first_name} {tech.last_name}</span>
                </label>
              );
            })}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReassignOpen(false)}>Cancelar</Button>
              <Button onClick={async () => { try { await OrdersApi.assignTechnicians(order.id, selectedTechnicians); toast({ type: 'success', message: 'Técnicos reasignados' }); setInitialTechnicians([...selectedTechnicians]); setReassignOpen(false); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo reasignar técnicos' }); } }}>Guardar</Button>
            </div>
          </div>
        </Modal>

        <ConfirmModal open={confirmClose} title="Descartar cambios" message="Tenés cambios sin guardar en comentarios, reasignación, cierre técnico o materiales. ¿Cerrar igualmente?" onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); onClose(); }} />
        <ConfirmModal open={confirmCancel} title="Cancelar orden" message={`¿Cancelar la orden #${order.id.slice(0, 8)}? Esta acción impactará el seguimiento operativo.`} onCancel={() => { if (!cancelLoading) setConfirmCancel(false); }} onConfirm={async () => { setCancelLoading(true); try { await OrdersApi.patch(order.id, { estado: 'cancelado' }); toast({ type: 'info', message: 'Orden cancelada' }); setConfirmCancel(false); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo cancelar la orden' }); } finally { setCancelLoading(false); } }} confirmDisabled={cancelLoading} cancelDisabled={cancelLoading} />
      </>
    </ErrorBoundary>
  );
}
