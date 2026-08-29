"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { RealityCardGuide } from "@/components/RealityCardGuide";
import { useAuth } from "@/context/AuthProvider";
import { useGameSocket } from "@/context/GameSocketProvider";

export default function TopPage() {
  const router = useRouter();
  const { session, displayName } = useAuth();
  const { state, createRoom, joinRoom, clearError } = useGameSocket();

  const [playerNameInput, setPlayerNameInput] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // ログイン中はプロフィールの表示名を初期値にする（未編集の間だけ）。編集済みなら入力値を優先。
  const playerName = playerNameInput || displayName || "";

  useEffect(() => {
    if (state.roomCode) {
      router.push(`/room/${state.roomCode}`);
    }
  }, [state.roomCode, router]);

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="pop-title text-3xl text-[var(--pop-ink)] drop-shadow-sm">妄想ジャッジメント</h1>
          <p className="text-sm text-[var(--pop-ink-soft)]">妄想か現実か究極の心理戦ここに開幕...</p>
        </div>

        <div className="pop-panel p-4">
          <AuthPanel />
        </div>

        {state.errorMessage && (
          <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 text-sm px-4 py-2 flex justify-between items-center">
            <span>{state.errorMessage}</span>
            <button onClick={clearError} className="text-rose-500 font-bold">
              ×
            </button>
          </div>
        )}

        <div className="pop-panel p-4 space-y-2">
          <label className="block text-sm font-bold text-[var(--pop-ink)]">プレイヤー名</label>
          <input
            className="w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 focus:outline-none focus:border-violet-400"
            value={playerName}
            onChange={(e) => setPlayerNameInput(e.target.value)}
            placeholder="名前を入力"
            maxLength={20}
          />
        </div>

        <section className="pop-panel p-4 space-y-3">
          <h2 className="font-bold text-[var(--pop-ink)]">ルームを作成する</h2>
          <button
            disabled={!playerName.trim()}
            onClick={() => createRoom(playerName.trim(), session?.access_token)}
            className="pop-bounce w-full rounded-full bg-gradient-to-r from-sky-300 to-blue-400 text-white font-bold py-2.5 shadow-[0_5px_0_rgba(150,120,200,0.35)] disabled:opacity-40 disabled:shadow-none"
          >
            ルーム作成
          </button>
        </section>

        <section className="pop-panel p-4 space-y-3">
          <h2 className="font-bold text-[var(--pop-ink)]">コードで入室する</h2>
          <input
            className="w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 tracking-widest uppercase focus:outline-none focus:border-violet-400"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ルームコード"
            maxLength={6}
          />
          <button
            disabled={!playerName.trim() || !joinCode.trim()}
            onClick={() => joinRoom(joinCode.trim(), playerName.trim(), session?.access_token)}
            className="pop-bounce w-full rounded-full bg-gradient-to-r from-fuchsia-300 to-purple-400 text-white font-bold py-2.5 shadow-[0_5px_0_rgba(150,120,200,0.35)] disabled:opacity-40 disabled:shadow-none"
          >
            入室する
          </button>
        </section>

        <RealityCardGuide />
      </div>
    </main>
  );
}
