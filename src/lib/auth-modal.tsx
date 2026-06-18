import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthModalCtx {
  open: boolean;
  openAuth: () => void;
  closeAuth: () => void;
}

const Ctx = createContext<AuthModalCtx | undefined>(undefined);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, openAuth: () => setOpen(true), closeAuth: () => setOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
