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

function readDomDarkMode(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark');
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
  const initial = readDomDarkMode();
  applyDarkMode(initial);

  return {
    darkMode: initial,
    commandOpen: false,
    mobileSidebarOpen: false,
    setDarkMode: (darkMode) => {
      applyDarkMode(darkMode);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
        } catch {
          // keep runtime stable when storage is unavailable.
        }
      }
      set({ darkMode });
    },
    setCommandOpen: (commandOpen) => set({ commandOpen }),
    setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen })
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    try {
      if (event.key !== THEME_STORAGE_KEY || !event.newValue) return;
      const dark = event.newValue === 'dark';
      applyDarkMode(dark);
      uiStore.setState({ darkMode: dark });
    } catch {
      // never let theme sync crash the UI.
    }
  });
}
