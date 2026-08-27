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
  GameOverResult,
  PlayerSelection,
  PublicRoundResult,
  RoundsOption,
  SupportCardType,
} from "@battle/shared";
import type { HandPublicState } from "@battle/shared";
import { getSocket } from "@/lib/socket";

export type GamePhase =
  | "idle"
  | "waiting_for_opponent"
  | "selecting"
  | "waiting_for_result"
  | "round_result"
  | "gameover"
  | "opponent_left";

interface GameState {
  phase: GamePhase;
  roomCode: string | null;
  playerId: string | null;
  playerName: string | null;
  opponentName: string | null;
  roundsTarget: RoundsOption | null;
  winsNeeded: number;
  roundNumber: number;
  hand: HandPublicState | null;
  supportOptions: SupportCardType[];
  matchWins: Record<string, number>;
  lastRoundResult: PublicRoundResult | null;
  nextRoundReady: boolean;
  gameOverResult: GameOverResult | null;
  errorMessage: string | null;
}

const initialState: GameState = {
  phase: "idle",
  roomCode: null,
  playerId: null,
  playerName: null,
  opponentName: null,
  roundsTarget: null,
  winsNeeded: 0,
  roundNumber: 0,
  hand: null,
  supportOptions: [],
  matchWins: {},
  lastRoundResult: null,
  nextRoundReady: false,
  gameOverResult: null,
  errorMessage: null,
};

interface GameSocketContextValue {
  state: GameState;
  createRoom: (rounds: RoundsOption, playerName: string, accessToken?: string) => void;
  joinRoom: (roomCode: string, playerName: string, accessToken?: string) => void;
  submitSelection: (selection: PlayerSelection) => void;
  proceedToNextRound: () => void;
  clearError: () => void;
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
      ({ roundsTarget, winsNeeded, roundNumber, hand, opponentName, supportOptions }) => {
        setState((s) => ({
          ...s,
          roundsTarget,
          winsNeeded,
          roundNumber,
          hand,
          supportOptions,
          opponentName,
          matchWins: {},
          lastRoundResult: null,
          gameOverResult: null,
          nextRoundReady: false,
          phase: "selecting",
        }));
      },
    );

    socket.on("round_result", ({ result, yourHand }) => {
      setState((s) => ({
        ...s,
        lastRoundResult: result,
        matchWins: result.matchWins,
        hand: yourHand,
        phase: "round_result",
      }));
    });

    socket.on("phase_changed", ({ phase, supportOptions }) => {
      if (phase === "selecting") {
        setState((s) => ({
          ...s,
          nextRoundReady: true,
          roundNumber: s.roundNumber + 1,
          supportOptions,
        }));
      }
    });

    socket.on("game_over", ({ winnerId, matchWins }) => {
      setState((s) => ({
        ...s,
        gameOverResult: { winnerId, matchWins },
        matchWins,
        phase: "gameover",
      }));
    });

    socket.on("opponent_left", () => {
      setState((s) => ({ ...s, phase: "opponent_left" }));
    });

    socket.on("error", ({ message }) => {
      setState((s) => ({ ...s, errorMessage: message }));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback(
    (rounds: RoundsOption, playerName: string, accessToken?: string) => {
      setState((s) => ({ ...s, playerName }));
      socketRef.current.emit("create_room", { rounds, playerName, accessToken });
    },
    [],
  );

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

  const submitSelection = useCallback((selection: PlayerSelection) => {
    setState((s) => ({ ...s, phase: "waiting_for_result" }));
    socketRef.current.emit("select_cards", selection);
  }, []);

  const proceedToNextRound = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: "selecting",
      lastRoundResult: null,
      nextRoundReady: false,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, errorMessage: null }));
  }, []);

  return (
    <GameSocketContext.Provider
      value={{ state, createRoom, joinRoom, submitSelection, proceedToNextRound, clearError }}
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
