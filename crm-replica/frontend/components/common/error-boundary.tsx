'use client';

import { AlertTriangle } from 'lucide-react';
import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Card>
          <div className="flex flex-col items-start gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Algo salió mal</h2>
              <p className="text-sm text-[var(--text-secondary)]">Ocurrió un error inesperado en esta sección.</p>
            </div>
            <Button type="button" variant="secondary" onClick={this.reset}>Reintentar</Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
