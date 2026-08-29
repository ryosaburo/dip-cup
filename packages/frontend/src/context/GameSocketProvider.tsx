"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AttackSelection,
  DefenseSelection,
  GameOverResult,
  RealityCardId,
  TurnResult,
} from "@battle/shared";
import { getSocket } from "@/lib/socket";

export type GamePhase =
  | "idle"
  | "matchmaking"
  | "waiting_for_opponent"
  | "my_attack"
  | "waiting_attack"
  | "my_defense"
  | "waiting_defense"
  | "waiting_for_result"
  | "turn_result"
  | "gameover"
  | "opponent_left";

interface GameState {
  phase: GamePhase;
  roomCode: string | null;
  playerId: string | null;
  playerName: string | null;
  opponentName: string | null;
  turnNumber: number;
  attackerId: string | null;
  /** 現在の攻撃側にランダムで配られている現実カード（自分が攻撃側の時のみ意味を持つ） */
  dealtRealityCards: RealityCardId[];
  /** 防御側が確認する、今ターンの攻撃の申告ダメージ量（種類は伏せられる） */
  pendingDamage: number | null;
  lifeTotals: Record<string, number>;
  delusionGauges: Record<string, number>;
  /** 各プレイヤーが見破られずに成功させた妄想カードの累計回数（規定回数で勝利） */
  delusionSuccessCounts: Record<string, number>;
  lastTurnResult: TurnResult | null;
  nextAttackerId: string | null;
  /** 次の攻撃側に配られる現実カード（次のターンへ進むまでの一時保持） */
  nextDealtRealityCards: RealityCardId[];
  nextTurnReady: boolean;
  gameOverResult: GameOverResult | null;
  errorMessage: string | null;
}

const initialState: GameState = {
  phase: "idle",
  roomCode: null,
  playerId: null,
  playerName: null,
  opponentName: null,
  turnNumber: 0,
  attackerId: null,
  dealtRealityCards: [],
  pendingDamage: null,
  lifeTotals: {},
  delusionGauges: {},
  delusionSuccessCounts: {},
  lastTurnResult: null,
  nextAttackerId: null,
  nextDealtRealityCards: [],
  nextTurnReady: false,
  gameOverResult: null,
  errorMessage: null,
};

interface GameSocketContextValue {
  state: GameState;
  createRoom: (playerName: string, accessToken?: string) => void;
  joinRoom: (roomCode: string, playerName: string, accessToken?: string) => void;
  findMatch: (playerName: string, accessToken?: string) => void;
  cancelMatchmaking: () => void;
  submitAttack: (attack: AttackSelection) => void;
  submitDefense: (defense: DefenseSelection) => void;
  proceedToNextTurn: () => void;
  clearError: () => void;
  leaveRoom: () => void;
}

const GameSocketContext = createContext<GameSocketContextValue | null>(null);

export function GameSocketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(initialState);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    socket.on("room_created", ({ roomCode, playerId }) => {
      setState((s) => ({ ...s, roomCode, playerId, phase: "waiting_for_opponent" }));
    });

    socket.on("room_joined", ({ roomCode, playerId, opponentName }) => {
      setState((s) => ({ ...s, roomCode, playerId, opponentName }));
    });

    socket.on(
      "game_start",
      ({
        turnNumber,
        opponentName,
        lifeTotals,
        delusionGauges,
        attackerId,
        dealtRealityCards,
        delusionSuccessCounts,
      }) => {
        setState((s) => ({
          ...s,
          turnNumber,
          lifeTotals,
          delusionGauges,
          delusionSuccessCounts,
          attackerId,
          dealtRealityCards,
          opponentName,
          pendingDamage: null,
          lastTurnResult: null,
          nextAttackerId: null,
          nextDealtRealityCards: [],
          nextTurnReady: false,
          gameOverResult: null,
          phase: attackerId === s.playerId ? "my_attack" : "waiting_attack",
        }));
      },
    );

    socket.on("attack_submitted", ({ damage, attackerId, turnNumber }) => {
      setState((s) => ({
        ...s,
        turnNumber,
        attackerId,
        pendingDamage: damage,
        lastTurnResult: null,
        nextAttackerId: null,
        nextTurnReady: false,
        phase: attackerId === s.playerId ? "waiting_defense" : "my_defense",
      }));
    });

    socket.on("turn_result", ({ result, nextAttackerId, nextDealtRealityCards }) => {
      setState((s) => ({
        ...s,
        lastTurnResult: result,
        lifeTotals: result.lifeTotals,
        delusionGauges: result.delusionGauges,
        delusionSuccessCounts: result.delusionSuccessCounts,
        nextAttackerId,
        nextDealtRealityCards,
        nextTurnReady: true,
        phase: "turn_result",
      }));
    });

    socket.on("game_over", ({ winnerId, lifeTotals, delusionGauges, delusionSuccessCounts }) => {
      setState((s) => ({
        ...s,
        gameOverResult: { winnerId, lifeTotals, delusionGauges, delusionSuccessCounts },
        lifeTotals,
        delusionGauges,
        delusionSuccessCounts,
        phase: "gameover",
      }));
    });

    socket.on("opponent_left", () => {
      setState((s) => ({ ...s, phase: "opponent_left" }));
    });

    socket.on("matchmaking_waiting", () => {
      setState((s) => ({ ...s, phase: "matchmaking" }));
    });

    socket.on("error", ({ message }) => {
      setState((s) => ({ ...s, errorMessage: message }));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string, accessToken?: string) => {
    setState((s) => ({ ...s, playerName }));
    socketRef.current.emit("create_room", { playerName, accessToken });
  }, []);

  const joinRoom = useCallback(
    (roomCode: string, playerName: string, accessToken?: string) => {
      setState((s) => ({ ...s, playerName }));
      socketRef.current.emit("join_room", {
        roomCode: roomCode.toUpperCase(),
        playerName,
        accessToken,
      });
    },
    [],
  );

  const findMatch = useCallback((playerName: string, accessToken?: string) => {
    setState((s) => ({ ...s, playerName, phase: "matchmaking" }));
    socketRef.current.emit("find_match", { playerName, accessToken });
  }, []);

  const cancelMatchmaking = useCallback(() => {
    socketRef.current.emit("cancel_match");
    setState((s) => ({ ...s, phase: "idle" }));
  }, []);

  const submitAttack = useCallback((attack: AttackSelection) => {
    socketRef.current.emit("submit_attack", attack);
  }, []);

  const submitDefense = useCallback((defense: DefenseSelection) => {
    setState((s) => ({ ...s, phase: "waiting_for_result" }));
    socketRef.current.emit("submit_defense", defense);
  }, []);

  const proceedToNextTurn = useCallback(() => {
    setState((s) => {
      if (!s.nextAttackerId) return s;
      return {
        ...s,
        attackerId: s.nextAttackerId,
        dealtRealityCards: s.nextDealtRealityCards,
        turnNumber: s.turnNumber + 1,
        pendingDamage: null,
        lastTurnResult: null,
        nextAttackerId: null,
        nextDealtRealityCards: [],
        nextTurnReady: false,
        phase: s.nextAttackerId === s.playerId ? "my_attack" : "waiting_attack",
      };
    });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, errorMessage: null }));
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current.emit("leave_room");
    setState(initialState);
  }, []);

  return (
    <GameSocketContext.Provider
      value={{
        state,
        createRoom,
        joinRoom,
        findMatch,
        cancelMatchmaking,
        submitAttack,
        submitDefense,
        proceedToNextTurn,
        clearError,
        leaveRoom,
      }}
    >
      {children}
    </GameSocketContext.Provider>
  );
}

export function useGameSocket() {
  const ctx = useContext(GameSocketContext);
  if (!ctx) throw new Error("useGameSocket must be used within GameSocketProvider");
  return ctx;
}
