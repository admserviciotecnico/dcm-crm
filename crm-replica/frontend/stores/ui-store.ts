import { create } from 'zustand';

type UiState = {
  darkMode: boolean;
  commandOpen: boolean;
  mobileSidebarOpen: boolean;
  setDarkMode: (v: boolean) => void;
  initTheme: () => void;
  toggleTheme: () => void;
  setCommandOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
};

export const uiStore = create<UiState>((set, get) => ({
  darkMode: true,
  commandOpen: false,
  mobileSidebarOpen: false,
  setDarkMode: (darkMode) => {
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', darkMode);
    if (typeof window !== 'undefined') window.localStorage.setItem('dcm-theme', darkMode ? 'dark' : 'light');
    set({ darkMode });
  },
  initTheme: () => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('dcm-theme');
    const darkMode = saved ? saved === 'dark' : true;
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', darkMode);
    set({ darkMode });
  },
  toggleTheme: () => get().setDarkMode(!get().darkMode),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen })
}));
