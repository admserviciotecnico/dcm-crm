import { create } from 'zustand';

type UiState = {
  darkMode: boolean;
  themeReady: boolean;
  commandOpen: boolean;
  mobileSidebarOpen: boolean;
  hydrateTheme: () => void;
  setDarkMode: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
};

const THEME_STORAGE_KEY = 'themePreference';

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {
    // ignore storage read failures (private mode/security policy) and fallback to DOM state.
  }
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) return true;
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

  return {
    darkMode: initial,
    themeReady: false,
    commandOpen: false,
    mobileSidebarOpen: false,
    hydrateTheme: () => {
      const next = getInitialDarkMode();
      applyDarkMode(next);
      set({ darkMode: next, themeReady: true });
    },
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
      uiStore.setState({ darkMode: dark, themeReady: true });
    } catch {
      // never let theme sync crash the UI.
    }
  });
}
