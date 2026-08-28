"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";

export function AuthPanel() {
  const { session, displayName, isConfigured, signUp, signIn, signOut } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isConfigured) return null;

  if (session) {
    return (
      <div className="flex items-center justify-between text-sm text-[var(--pop-ink)]">
        <span>
          ログイン中：<span className="font-bold">{displayName ?? session.user.email}</span>
        </span>
        <button onClick={() => signOut()} className="text-[var(--pop-ink-soft)] underline">
          ログアウト
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    const error =
      mode === "signup" ? await signUp(email, password, name.trim() || email) : await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setMessage(error);
    } else if (mode === "signup") {
      setMessage("確認メールの設定によっては、そのままログインできます。");
    }
  };

  return (
    <div className="space-y-3 text-sm text-[var(--pop-ink)]">
      <div className="flex gap-2">
        <button
          onClick={() => setMode("login")}
          className={`pop-bounce flex-1 rounded-full py-1.5 font-bold ${
            mode === "login"
              ? "bg-[var(--pop-ink)] text-white"
              : "border-2 border-[var(--pop-ink)]/20 text-[var(--pop-ink-soft)]"
          }`}
        >
          ログイン
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`pop-bounce flex-1 rounded-full py-1.5 font-bold ${
            mode === "signup"
              ? "bg-[var(--pop-ink)] text-white"
              : "border-2 border-[var(--pop-ink)]/20 text-[var(--pop-ink-soft)]"
          }`}
        >
          新規登録
        </button>
      </div>

      {mode === "signup" && (
        <input
          className="w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 focus:outline-none focus:border-violet-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="表示名（未入力ならメールの@より前を使用）"
        />
      )}
      <input
        className="w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 focus:outline-none focus:border-violet-400"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
      />
      <input
        className="w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 focus:outline-none focus:border-violet-400"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード（6文字以上）"
      />

      {message && <p className="text-rose-500">{message}</p>}

      <button
        disabled={!email.trim() || password.length < 6 || submitting}
        onClick={handleSubmit}
        className="pop-bounce w-full rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-400 text-white font-bold py-2 shadow-[0_5px_0_rgba(150,120,200,0.35)] disabled:opacity-40 disabled:shadow-none"
      >
        {mode === "signup" ? "登録する" : "ログインする"}
      </button>
      <p className="text-[var(--pop-ink-soft)]">ログインしなくてもゲストとしてプレイできます。</p>
    </div>
  );
}
