import { create } from 'zustand';

type UiState = {
  darkMode: boolean;
  commandOpen: boolean;
  mobileSidebarOpen: boolean;
  setDarkMode: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
};

const THEME_STORAGE_KEY = 'themePreference';

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  if (document.documentElement.classList.contains('dark')) return true;
  return true;
}

function applyDarkMode(dark: boolean) {
  if (typeof document === 'undefined') return;
  if (dark) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
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
        localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
      }
      set({ darkMode });
    },
    setCommandOpen: (commandOpen) => set({ commandOpen }),
    setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen })
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY || !event.newValue) return;
    const dark = event.newValue === 'dark';
    applyDarkMode(dark);
    uiStore.setState({ darkMode: dark });
  });
}
