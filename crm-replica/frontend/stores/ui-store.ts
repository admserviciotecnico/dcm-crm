import { create } from 'zustand';

type UiState = {
  darkMode: boolean;
  commandOpen: boolean;
  mobileSidebarOpen: boolean;
  setDarkMode: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
};

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) return stored === 'true';
  return true;
}

function applyDarkMode(dark: boolean) {
  if (typeof document === 'undefined') return;
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const uiStore = create<UiState>((set) => {
  const initial = getInitialDarkMode();
  applyDarkMode(initial);

  return {
    darkMode: initial,
    commandOpen: false,
    mobileSidebarOpen: false,
    setDarkMode: (darkMode) => {
      applyDarkMode(darkMode);
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', String(darkMode));
      }
      set({ darkMode });
    },
    setCommandOpen: (commandOpen) => set({ commandOpen }),
    setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen })
  };
});
