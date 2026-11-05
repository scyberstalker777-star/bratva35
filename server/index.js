
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../client/dist');
const allowedOrigin = process.env.CLIENT_ORIGIN;

app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json({ limit: '20kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'БРАТВА 35' });
});

// Список активных комнат и участников
app.get('/rooms', async (_req, res) => {
  try {
    if (
      !process.env.LIVEKIT_API_KEY ||
      !process.env.LIVEKIT_API_SECRET ||
      !process.env.LIVEKIT_URL
    ) {
      return res.status(503).json({ error: 'LiveKit не настроен.' });
    }

    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );

    const knownRooms = ['main', 'dota2', 'chill'];
    const activeRooms = await roomService.listRooms();
    const activeNames = activeRooms.map(room => room.name);
    const allNames = [...new Set([...knownRooms, ...activeNames])];

    const rooms = await Promise.all(
      allNames.map(async name => {
        const exists = activeNames.includes(name);

        if (!exists) {
          return {
            name,
            count: 0,
            participants: []
          };
        }

        const participants = await roomService.listParticipants(name);

        return {
          name,
          count: participants.length,
          participants: participants.map(person => ({
            identity: person.identity,
            name: person.name || person.identity
          }))
        };
      })
    );

    res.json({ rooms });
  } catch (error) {
    console.error('Rooms error:', error);
    res.status(500).json({ error: 'Не удалось получить список комнат.' });
  }
});

// Выдача токена для входа
app.post('/token', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 24);
    const room = String(req.body?.room || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 40);

    if (!name || !room) {
      return res.status(400).json({ error: 'Укажи имя и комнату.' });
    }

    if (
      !process.env.LIVEKIT_API_KEY ||
      !process.env.LIVEKIT_API_SECRET ||
      !process.env.LIVEKIT_URL
    ) {
      return res.status(503).json({
        error: 'Голосовой сервер ещё не настроен.'
      });
    }

    const safeIdentity = name
      .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '')
      .slice(0, 16) || 'guest';

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: `${safeIdentity}-${crypto.randomUUID().slice(0, 8)}`,
        name,
        ttl: '2h'
      }
    );

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true
    });

    res.json({
      token: await token.toJwt(),
      url: process.env.LIVEKIT_URL
    });
  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({
      error: 'Не удалось подготовить подключение.'
    });
  }
});

if (process.env.SERVE_CLIENT !== 'false') {
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (req.path === '/token' || req.path === '/health' || req.path === '/rooms') {
      return next();
    }

    res.sendFile(
      path.join(clientDist, 'index.html'),
      err => err && next(err)
    );
  });
}

const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`БРАТВА 35 server listening on ${port}`);
});
