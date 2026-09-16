"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DEMO_STEPS, type DemoContext } from "./steps";

interface DemoState {
  active: boolean;
  step: number; // 1-based
  ctx: DemoContext;
}

interface DemoGuideApi extends DemoState {
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goTo: (step: number) => void;
  setContext: (patch: Partial<DemoContext>) => void;
  currentRoute: () => string | null;
}

const KEY = "urizun.demo.guide.v1";
const DEFAULT: DemoState = { active: false, step: 1, ctx: { proposalId: null, caseId: null, inboxItemId: "INBOX-001" } };

const Ctx = React.createContext<DemoGuideApi | null>(null);

function resolveRoute(step: number, ctx: DemoContext): string | null {
  const def = DEMO_STEPS[step - 1];
  if (!def) return null;
  const r = typeof def.route === "function" ? def.route(ctx) : def.route;
  return r ?? null;
}

export function DemoGuideProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<DemoState>(DEFAULT);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Hydrate from localStorage after mount (external store → React state; cannot run during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => {
      try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? { ...DEFAULT, ...(JSON.parse(raw) as DemoState) } : s;
      } catch {
        return s;
      }
    });
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const navigate = React.useCallback((step: number, ctx: DemoContext) => {
    const route = resolveRoute(step, ctx);
    if (route) router.push(route);
  }, [router]);

  // Navigation happens outside setState updaters (calling router.push inside an updater runs during render).
  const api = React.useMemo<DemoGuideApi>(() => {
    const move = (step: number, ctx: DemoContext = state.ctx) => {
      setState((s) => ({ ...s, step, ctx }));
      navigate(step, ctx);
    };
    return {
      ...state,
      start: () => {
        const ctx = { ...DEFAULT.ctx };
        setState({ active: true, step: 1, ctx });
        navigate(1, ctx);
      },
      stop: () => setState((s) => ({ ...s, active: false })),
      next: () => move(Math.min(DEMO_STEPS.length, state.step + 1)),
      prev: () => move(Math.max(1, state.step - 1)),
      goTo: (step) => move(step),
      setContext: (patch) => setState((s) => ({ ...s, ctx: { ...s.ctx, ...patch } })),
      currentRoute: () => resolveRoute(state.step, state.ctx),
    };
  }, [state, navigate]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDemoGuide() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDemoGuide must be used within DemoGuideProvider");
  return ctx;
}
