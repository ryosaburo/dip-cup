"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
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
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">AIエージェント学習対戦</h1>
          <p className="text-sm text-neutral-500">
            「現実」か「妄想」、相手の手を見破れ。見破られると効果は自分に跳ね返る。
          </p>
        </div>

        <AuthPanel />

        {state.errorMessage && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 flex justify-between items-center">
            <span>{state.errorMessage}</span>
            <button onClick={clearError} className="text-red-500 font-bold">
              ×
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium">プレイヤー名</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={playerName}
            onChange={(e) => setPlayerNameInput(e.target.value)}
            placeholder="名前を入力"
            maxLength={20}
          />
        </div>

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">ルームを作成する</h2>
          <button
            disabled={!playerName.trim()}
            onClick={() => createRoom(playerName.trim(), session?.access_token)}
            className="w-full rounded-md bg-black text-white py-2 disabled:opacity-40"
          >
            ルーム作成
          </button>
        </section>

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">コードで入室する</h2>
          <input
            className="w-full border rounded-md px-3 py-2 tracking-widest uppercase"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ルームコード"
            maxLength={6}
          />
          <button
            disabled={!playerName.trim() || !joinCode.trim()}
            onClick={() => joinRoom(joinCode.trim(), playerName.trim(), session?.access_token)}
            className="w-full rounded-md border py-2 disabled:opacity-40"
          >
            入室する
          </button>
        </section>
      </div>
    </main>
  );
}
