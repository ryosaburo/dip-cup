import http from "node:http";
import "dotenv/config";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@battle/shared";
import { RoomManager } from "./rooms/RoomManager.js";
import { registerHandlers } from "./socket/handlers.js";

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

const roomManager = new RoomManager();
registerHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`WS server listening on :${PORT} (CORS origin: ${CORS_ORIGIN})`);
});
