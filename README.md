# Qualia Commons Frontend — Iteration

The next Qualia UI: every product (Agent Flow, DialFlow, UltraChat, Business Pulse, Insights) and the
Qualia admin console on one design system, with the landing page's theme and logo.

**UI only.** Screens read mock data through `src/services/*`; no backend calls yet.

```bash
npm install
npm run dev      # http://localhost:5180
npm run build
```

Sign in from `/login` with any details, or pick a role under **Preview as**. Any URL also accepts
`?as=admin|agent|superadmin` and `?theme=light|dark`.

| Product | Path | Who |
|---|---|---|
| Home (app launcher) | `/home` | everyone |
| Agent Flow — AI voice agents | `/agentflow` | tenant admins |
| DialFlow — dialer and supervision | `/dialflow` | agents (workspace), admins (console) |
| UltraChat — WhatsApp | `/ultrachat` | admins; agents get inbox + templates |
| Business Pulse — AI call QA (was CallPulse) | `/businesspulse` | admins; agents get their scores and coaching |
| Insights — ask your data | `/insights` | tenant admins |
| Admin console | `/admin` | Qualia super admins |

How the code is organised and the rules every screen follows: [ARCHITECTURE.md](ARCHITECTURE.md).
