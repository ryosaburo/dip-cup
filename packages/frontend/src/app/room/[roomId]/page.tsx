"use client";

import { useParams, useRouter } from "next/navigation";
import { useGameSocket } from "@/context/GameSocketProvider";
import { GameField } from "@/components/GameField";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { state, submitAttack, submitDefense, proceedToNextTurn, leaveRoom } = useGameSocket();

  const backToTop = () => {
    leaveRoom();
    router.push("/");
  };

  if (state.phase === "idle") {
    return (
      <Centered>
        <p>ルーム「{roomId}」の情報が見つかりません。トップからやり直してください。</p>
        <button onClick={backToTop} className="pop-bounce text-[var(--pop-ink-soft)] underline">
          トップへ戻る
        </button>
      </Centered>
    );
  }

  if (state.phase === "opponent_left") {
    return (
      <Centered>
        <p>相手が退室しました。対戦を終了します。</p>
        <button onClick={backToTop} className="pop-bounce text-[var(--pop-ink-soft)] underline">
          トップへ戻る
        </button>
      </Centered>
    );
  }

  if (state.phase === "waiting_for_opponent") {
    return (
      <Centered>
        <p className="text-sm text-[var(--pop-ink-soft)]">このコードを相手に伝えてください</p>
        <p className="pop-title text-4xl text-[var(--pop-ink)] tracking-[0.3em]">{state.roomCode}</p>
        <p className="text-sm text-[var(--pop-ink-soft)] animate-pulse">相手の入室を待っています…</p>
      </Centered>
    );
  }

  if (state.phase === "gameover" && state.gameOverResult && state.playerId) {
    const isDraw = state.gameOverResult.winnerId === null;
    const won = state.gameOverResult.winnerId === state.playerId;
    return (
      <Centered>
        {!isDraw && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={won ? "/win.jpg" : "/lose.jpg"}
            alt={won ? "勝利" : "敗北"}
            className={`max-w-[90vw] max-h-[55vh] w-auto h-auto rounded-2xl border-[3px] border-white shadow-[0_8px_0_rgba(150,120,200,0.35)] ${
              won ? "pop-win-in" : "shatter-to-reality"
            }`}
          />
        )}
        <h1 className="pop-title text-3xl text-[var(--pop-ink)]">
          {isDraw ? "引き分け" : won ? "勝利！" : "敗北…"}
        </h1>
        <p className="text-[var(--pop-ink)]">
          最終ライフ {state.gameOverResult.lifeTotals[state.playerId] ?? 0} -{" "}
          {Object.entries(state.gameOverResult.lifeTotals).find(
            ([id]) => id !== state.playerId,
          )?.[1] ?? 0}
        </p>
        <p className="text-sm text-[var(--pop-ink-soft)]">
          最終妄想ゲージ {state.gameOverResult.delusionGauges[state.playerId] ?? 0}% -{" "}
          {Object.entries(state.gameOverResult.delusionGauges).find(
            ([id]) => id !== state.playerId,
          )?.[1] ?? 0}
          %
        </p>
        <p className="text-sm text-[var(--pop-ink-soft)]">
          妄想成功回数 {state.gameOverResult.delusionSuccessCounts[state.playerId] ?? 0} -{" "}
          {Object.entries(state.gameOverResult.delusionSuccessCounts).find(
            ([id]) => id !== state.playerId,
          )?.[1] ?? 0}
        </p>
        <button
          onClick={backToTop}
          className="pop-bounce mt-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-400 text-white font-bold px-6 py-2.5 shadow-[0_5px_0_rgba(150,120,200,0.35)]"
        >
          トップへ戻る
        </button>
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
      <main className="flex-1 p-3 sm:p-6 max-w-5xl mx-auto w-full">
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
      <div className="pop-panel flex flex-col items-center gap-3 px-6 py-8 sm:px-10 sm:py-10 max-w-md">
        {children}
      </div>
    </main>
  );
}
