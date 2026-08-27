"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGameSocket } from "@/context/GameSocketProvider";
import { GameField } from "@/components/GameField";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { state, submitSelection, proceedToNextRound } = useGameSocket();

  if (state.phase === "idle") {
    return (
      <Centered>
        <p>ルーム「{roomId}」の情報が見つかりません。トップからやり直してください。</p>
        <Link href="/" className="underline">
          トップへ戻る
        </Link>
      </Centered>
    );
  }

  if (state.phase === "opponent_left") {
    return (
      <Centered>
        <p>相手が退室しました。対戦を終了します。</p>
        <Link href="/" className="underline">
          トップへ戻る
        </Link>
      </Centered>
    );
  }

  if (state.phase === "waiting_for_opponent") {
    return (
      <Centered>
        <p className="text-sm text-neutral-500">このコードを相手に伝えてください</p>
        <p className="text-4xl font-bold tracking-[0.3em]">{state.roomCode}</p>
        <p className="text-sm text-neutral-500">相手の入室を待っています…</p>
      </Centered>
    );
  }

  if (state.phase === "gameover" && state.gameOverResult && state.playerId) {
    const won = state.gameOverResult.winnerId === state.playerId;
    return (
      <Centered>
        <h1 className="text-3xl font-bold">{won ? "勝利！" : "敗北…"}</h1>
        <p>
          最終スコア {state.matchWins[state.playerId] ?? 0} -{" "}
          {Object.entries(state.matchWins).find(([id]) => id !== state.playerId)?.[1] ?? 0}
        </p>
        <Link href="/" className="underline">
          トップへ戻る
        </Link>
      </Centered>
    );
  }

  if (
    (state.phase === "selecting" ||
      state.phase === "waiting_for_result" ||
      state.phase === "round_result") &&
    state.hand &&
    state.playerId
  ) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <GameField
          playerId={state.playerId}
          playerName={state.playerName}
          opponentName={state.opponentName}
          matchWins={state.matchWins}
          roundNumber={state.roundNumber}
          winsNeeded={state.winsNeeded}
          phase={state.phase}
          hand={state.hand}
          supportOptions={state.supportOptions}
          onSubmit={submitSelection}
          lastRoundResult={state.lastRoundResult}
          nextRoundReady={state.nextRoundReady}
          onNextRound={proceedToNextRound}
        />
      </main>
    );
  }

  return <Centered>読み込み中…</Centered>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </main>
  );
}
