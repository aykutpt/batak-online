import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { registerHandlers } from './socket/handlers';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log(`[Socket] connected: ${socket.id}`);
  registerHandlers(io, socket);
  socket.on('disconnect', () => console.log(`[Socket] disconnected: ${socket.id}`));
});

httpServer.listen(PORT, () => {
  console.log(`Batak server running on port ${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN}`);
});
