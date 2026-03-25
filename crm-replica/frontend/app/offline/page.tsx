export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] p-6 text-center">
      <div className="max-w-md rounded-[16px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Sin conexión</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">La app seguirá mostrando el shell instalado y las órdenes asignadas que ya hayas sincronizado en este dispositivo.</p>
      </div>
    </main>
  );
}
