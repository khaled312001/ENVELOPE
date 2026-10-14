import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

/*
  THE SAME KEY AS THE CURRENT SITE — `envelope.theme`, holding 'light' or 'dark'.

  A reader who chose dark on `/app` opens this one dark. With nothing stored the
  site opens LIGHT, whatever the operating system prefers — the owner's call of
  14 Oct 2026, and the classic studio's rule already: a document put in front
  of a committee is read on white. Dark is one click away and remembered.
*/
const KEY = 'envelope.theme';

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/** Called once by `main.tsx` before React renders, so the first frame is already the right theme. */
export function applyTheme(theme: Theme = stored() ?? 'light'): void {
  document.documentElement.dataset['theme'] = theme;
}

interface ThemeValue {
  readonly theme: Theme;
  readonly toggle: () => void;
}

const ThemeContext = createContext<ThemeValue>({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [chosen, setChosen] = useState<Theme | null>(stored);
  const theme = chosen ?? 'light';

  useEffect(() => applyTheme(theme), [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* applied, not remembered */
    }
    setChosen(next);
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
