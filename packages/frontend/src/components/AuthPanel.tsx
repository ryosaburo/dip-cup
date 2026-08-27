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
      <div className="rounded-lg border p-3 flex items-center justify-between text-sm">
        <span>
          ログイン中：<span className="font-semibold">{displayName ?? session.user.email}</span>
        </span>
        <button onClick={() => signOut()} className="text-neutral-500 underline">
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
    <div className="rounded-lg border p-4 space-y-3 text-sm">
      <div className="flex gap-2">
        <button
          onClick={() => setMode("login")}
          className={`flex-1 rounded-md py-1.5 ${mode === "login" ? "bg-black text-white" : "border"}`}
        >
          ログイン
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`flex-1 rounded-md py-1.5 ${mode === "signup" ? "bg-black text-white" : "border"}`}
        >
          新規登録
        </button>
      </div>

      {mode === "signup" && (
        <input
          className="w-full border rounded-md px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="表示名（未入力ならメールの@より前を使用）"
        />
      )}
      <input
        className="w-full border rounded-md px-3 py-2"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
      />
      <input
        className="w-full border rounded-md px-3 py-2"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード（6文字以上）"
      />

      {message && <p className="text-red-600">{message}</p>}

      <button
        disabled={!email.trim() || password.length < 6 || submitting}
        onClick={handleSubmit}
        className="w-full rounded-md border py-2 disabled:opacity-40"
      >
        {mode === "signup" ? "登録する" : "ログインする"}
      </button>
      <p className="text-neutral-400">ログインしなくてもゲストとしてプレイできます。</p>
    </div>
  );
}
