"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useGameSocket } from "@/context/GameSocketProvider";
import { GameField } from "@/components/GameField";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { state, submitAttack, submitDefense, proceedToNextTurn } = useGameSocket();

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
    const isDraw = state.gameOverResult.winnerId === null;
    const won = state.gameOverResult.winnerId === state.playerId;
    return (
      <Centered>
        <h1 className="text-3xl font-bold">{isDraw ? "引き分け" : won ? "勝利！" : "敗北…"}</h1>
        <p>
          最終ライフ {state.gameOverResult.lifeTotals[state.playerId] ?? 0} -{" "}
          {Object.entries(state.gameOverResult.lifeTotals).find(
            ([id]) => id !== state.playerId,
          )?.[1] ?? 0}
        </p>
        <p className="text-sm text-neutral-500">
          最終妄想ゲージ {state.gameOverResult.delusionGauges[state.playerId] ?? 0}% -{" "}
          {Object.entries(state.gameOverResult.delusionGauges).find(
            ([id]) => id !== state.playerId,
          )?.[1] ?? 0}
          %
        </p>
        <p className="text-sm text-neutral-500">
          妄想成功回数 {state.gameOverResult.delusionSuccessCounts[state.playerId] ?? 0} -{" "}
          {Object.entries(state.gameOverResult.delusionSuccessCounts).find(
            ([id]) => id !== state.playerId,
          )?.[1] ?? 0}
        </p>
        <Link href="/" className="underline">
          トップへ戻る
        </Link>
      </Centered>
    );
  }

  if (
    (state.phase === "my_attack" ||
      state.phase === "waiting_attack" ||
      state.phase === "my_defense" ||
      state.phase === "waiting_defense" ||
      state.phase === "waiting_for_result" ||
      state.phase === "turn_result") &&
    state.playerId
  ) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <GameField
          playerId={state.playerId}
          playerName={state.playerName}
          opponentName={state.opponentName}
          lifeTotals={state.lifeTotals}
          delusionGauges={state.delusionGauges}
          delusionSuccessCounts={state.delusionSuccessCounts}
          turnNumber={state.turnNumber}
          phase={state.phase}
          dealtRealityCards={state.dealtRealityCards}
          pendingDamage={state.pendingDamage}
          onSubmitAttack={submitAttack}
          onSubmitDefense={submitDefense}
          lastTurnResult={state.lastTurnResult}
          nextTurnReady={state.nextTurnReady}
          onNextTurn={proceedToNextTurn}
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
