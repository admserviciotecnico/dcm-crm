import './globals.css';
import { ReactNode } from 'react';
import { Toaster } from '@/components/common/toaster';
import { GlobalLoader } from '@/components/common/global-loader';

const themeBootstrapScript = `
(function () {
  try {
    var darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'false') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (_error) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <GlobalLoader />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
