
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../client/dist');

app.use(cors());
app.use(express.json({ limit: '20kb' }));

// Проверка сервера
app.get('/health', (_req, res) => {
  res.json({ ok: true, app: 'БРАТВА 35' });
});

// Онлайн-посетители сайта
const onlineUsers = new Map();
const ONLINE_TIMEOUT = 15000;

function cleanOnline() {
  const now = Date.now();

  for (const [id, user] of onlineUsers) {
    if (now - user.lastSeen > ONLINE_TIMEOUT) {
      onlineUsers.delete(id);
    }
  }
}

app.get('/presence', (_req, res) => {
  cleanOnline();

  res.json({
    users: Array.from(onlineUsers.values()).map(user => ({
      id: user.id,
      name: user.name
    }))
  });
});

app.post('/presence/join', (req, res) => {
  cleanOnline();

  const id = String(req.body?.id || '').slice(0, 100);
  const name = String(req.body?.name || '').trim().slice(0, 24);

  if (!id || !name) {
    return res.status(400).json({ error: 'Укажи ID и ник.' });
  }

  onlineUsers.set(id, {
    id,
    name,
    lastSeen: Date.now()
  });

  res.json({ ok: true });
});

app.post('/presence/heartbeat', (req, res) => {
  const id = String(req.body?.id || '').slice(0, 100);
  const user = onlineUsers.get(id);

  if (user) {
    user.lastSeen = Date.now();
  }

  res.json({ ok: true });
});

app.post('/presence/leave', (req, res) => {
  const id = String(req.body?.id || '').slice(0, 100);

  onlineUsers.delete(id);

  res.json({ ok: true });
});

// Создание токена LiveKit
app.post('/token', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 24);

    const room = String(req.body?.room || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 40);

    if (!name || !room) {
      return res.status(400).json({
        error: 'Укажи имя и комнату.'
      });
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

// Раздача готового сайта
if (process.env.SERVE_CLIENT !== 'false') {
  app.use(express.static(clientDist));

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/token') ||
      req.path.startsWith('/presence') ||
      req.path.startsWith('/health')
    ) {
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
  console.log(`БРАТВА 35 запущена на порту ${port}`);
});
