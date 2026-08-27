"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  displayName: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  isConfigured: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchDisplayName(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();
  return data?.display_name ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    displayName: null,
    loading: Boolean(supabase),
  });

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(async ({ data }) => {
      const displayName = data.session ? await fetchDisplayName(data.session.user.id) : null;
      setState({ session: data.session, displayName, loading: false });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, session, loading: false }));
      if (session) {
        fetchDisplayName(session.user.id).then((displayName) =>
          setState((s) => ({ ...s, displayName })),
        );
      } else {
        setState((s) => ({ ...s, displayName: null }));
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    if (!supabase) return "Supabaseが設定されていません";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return error?.message ?? null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabaseが設定されていません";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, isConfigured: Boolean(supabase), signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
