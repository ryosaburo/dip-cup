// packages/server/src/index.ts
import http from "node:http";
import express, { type Request, type Response } from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import type { ClientToServerEvents, ServerToClientEvents } from "@battle/shared";
import { RoomManager } from "./rooms/RoomManager.js";
import { registerHandlers } from "./socket/handlers.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Request と Response の型を明示
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const roomManager = new RoomManager();
registerHandlers(io, roomManager);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Socket.io server running on port ${PORT}`);
});