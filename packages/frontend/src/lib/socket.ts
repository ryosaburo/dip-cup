import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@battle/shared";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(WS_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  return socket;
}