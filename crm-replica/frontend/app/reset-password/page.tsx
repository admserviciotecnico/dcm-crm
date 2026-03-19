import Link from 'next/link';
import { ResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage({ searchParams }: { searchParams?: { token?: string } }) {
  const token = searchParams?.token?.trim() ?? '';

  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--bg-app)] p-6">
        <div className="w-full max-w-md space-y-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Token inválido</h1>
          <p className="text-sm text-[var(--text-secondary)]">El enlace de recuperación es inválido o está incompleto.</p>
          <Link href="/forgot-password" className="text-xs text-[var(--primary)]">Solicitar nuevo enlace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg-app)] p-6">
      <ResetPasswordForm token={token} />
    </div>
  );
}
