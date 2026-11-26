import { createContext, useContext, useMemo, useState } from 'react';
import { usePersistentState } from '@/lib/hooks';

/*
 * Mock session. The real one will come from the Commons login token (role + product flags).
 * "View as" in the user menu switches role so every role's screens can be reviewed without logins.
 */
export const ROLES = {
  superadmin: { id: 'superadmin', label: 'Super admin', description: 'Qualia team: every tenant and the admin console' },
  admin: { id: 'admin', label: 'Tenant admin', description: 'Client manager: full product access' },
  agent: { id: 'agent', label: 'Agent', description: 'Calls and chats: workspace screens only' },
};

const DEMO_USERS = {
  superadmin: { name: 'Ankit Kumar', email: 'ankit@qualiabits.com', title: 'Qualia Ops' },
  admin: { name: 'Riya Malhotra', email: 'riya@rrparko.in', title: 'Operations Head' },
  agent: { name: 'Rahul Verma', email: 'AG-1042', title: 'Sales Agent' },
};

/** Roles inside a client company. The super admin is Qualia's internal team and has its own console + login. */
export const TENANT_ROLES = ['admin', 'agent'];

export const TENANT = { id: 'tn_rrparko', name: 'RR Parko', plan: 'Enterprise', products: ['agentflow', 'dialflow', 'ultrachat', 'businesspulse', 'insights'] };

const SessionCtx = createContext(null);

/** ?as=admin|agent|superadmin opens a preview session directly (for design reviews and screenshots). */
function previewRole() {
  const r = new URLSearchParams(window.location.search).get('as');
  return ROLES[r] ? { role: r } : null;
}

export function SessionProvider({ children }) {
  // ?as= wins over a stored session, so a shared preview link always opens as the named role.
  useState(() => {
    const preview = previewRole();
    try {
      if (preview) localStorage.setItem('qx-session', JSON.stringify(preview));
    } catch {
      /* storage blocked: usePersistentState falls back to the preview below */
    }
  });
  const [state, setState] = usePersistentState('qx-session', previewRole());
  const value = useMemo(() => {
    const role = state?.role;
    return {
      signedIn: !!state,
      role,
      user: role ? DEMO_USERS[role] : null,
      tenant: TENANT,
      signIn: (r = 'admin') => setState({ role: r }),
      signOut: () => setState(null),
      viewAs: (r) => setState({ role: r }),
    };
  }, [state, setState]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
