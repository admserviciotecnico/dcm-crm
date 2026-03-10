import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from '@/components/common/toaster';
import { GlobalLoader } from '@/components/common/global-loader';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>
        <GlobalLoader />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
