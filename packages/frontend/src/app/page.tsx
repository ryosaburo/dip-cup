"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RoundsOption } from "@battle/shared";
import { useGameSocket } from "@/context/GameSocketProvider";

const ROUNDS_OPTIONS: RoundsOption[] = [1, 3, 5];

export default function TopPage() {
  const router = useRouter();
  const { state, createRoom, joinRoom, clearError } = useGameSocket();

  const [playerName, setPlayerName] = useState("");
  const [rounds, setRounds] = useState<RoundsOption>(3);
  const [joinCode, setJoinCode] = useState("");

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
            プロンプトカードで学習スコアを競い、過学習には気をつけろ。
          </p>
        </div>

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
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="名前を入力"
            maxLength={20}
          />
        </div>

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">ルームを作成する</h2>
          <div className="flex gap-2">
            {ROUNDS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRounds(r)}
                className={`flex-1 rounded-md border py-2 text-sm ${
                  rounds === r ? "bg-black text-white" : "bg-white"
                }`}
              >
                {r}本勝負
              </button>
            ))}
          </div>
          <button
            disabled={!playerName.trim()}
            onClick={() => createRoom(rounds, playerName.trim())}
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
            onClick={() => joinRoom(joinCode.trim(), playerName.trim())}
            className="w-full rounded-md border py-2 disabled:opacity-40"
          >
            入室する
          </button>
        </section>
      </div>
    </main>
  );
}
