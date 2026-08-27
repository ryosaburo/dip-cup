import type {
  PlayerSelection,
  PublicRoundResult,
  RoomPhase,
  RoundsOption,
  SupportCardType,
} from "./types.js";

/** Client -> Server */
export interface ClientToServerEvents {
  create_room: (payload: {
    rounds: RoundsOption;
    playerName: string;
    accessToken?: string;
  }) => void;
  join_room: (payload: {
    roomCode: string;
    playerName: string;
    accessToken?: string;
  }) => void;
  select_cards: (payload: PlayerSelection) => void;
  leave_room: () => void;
}

export interface HandPublicState {
  remaining: Record<"small" | "medium" | "large", number>;
}

/** Server -> Client */
export interface ServerToClientEvents {
  room_created: (payload: { roomCode: string; playerId: string }) => void;
  room_joined: (payload: {
    roomCode: string;
    playerId: string;
    opponentName: string;
  }) => void;
  error: (payload: { message: string }) => void;
  game_start: (payload: {
    roundsTarget: RoundsOption;
    winsNeeded: number;
    roundNumber: number;
    hand: HandPublicState;
    opponentName: string;
    supportOptions: SupportCardType[];
  }) => void;
  phase_changed: (payload: { phase: RoomPhase; supportOptions: SupportCardType[] }) => void;
  round_result: (payload: {
    result: PublicRoundResult;
    yourHand: HandPublicState;
  }) => void;
  game_over: (payload: { winnerId: string; matchWins: Record<string, number> }) => void;
  opponent_left: () => void;
}
