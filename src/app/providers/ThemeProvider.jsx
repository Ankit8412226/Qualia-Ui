import { createContext, useContext } from 'react';

/* The platform is light-only. The provider stays so charts can keep reading `theme`. */
const ThemeCtx = createContext({ theme: 'light' });

export function ThemeProvider({ children }) {
  return <ThemeCtx.Provider value={{ theme: 'light' }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
