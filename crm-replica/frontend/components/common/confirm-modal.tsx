'use client';

import { Button } from '@/components/ui/button';

export function ConfirmModal({ open, title, message, onCancel, onConfirm }: { open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[210] grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}
