import { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDocumentTitle } from '@/lib/hooks';
import { productById } from '@/app/products';

/** Provided by AppShell: the current product and a way for pages to name themselves. */
export const ShellContext = createContext(null);
export const useShell = () => useContext(ShellContext);

/**
 * Names the current page for the browser tab ("Wakad 2BHK leads · Agent Flow · Qualia") and ⌘K recents.
 * Inside the app shell, pages on a sidebar route keep the sidebar label; sub pages (detail, wizard, 404) use this.
 * Outside the shell (login, home) it sets the tab title directly.
 */
export function usePageTitle(title, productId) {
  const shell = useShell();
  const { pathname } = useLocation();
  const register = shell?.setPageTitle;
  useEffect(() => {
    if (register && title) register({ path: pathname, title });
  }, [register, title, pathname]);
  useDocumentTitle(shell ? null : title, shell ? null : productById(productId)?.name);
}
