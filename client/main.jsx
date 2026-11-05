
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import './style.css';

const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

function RoomView({ onLeave }) {
  const tracks = useTracks([
    {
      source: Track.Source.Camera,
      with_placeholder: false
    },
    {
      source: Track.Source.Microphone,
      with_placeholder: true
    }
  ]);

  return (
    <section className="room">
      <div className="roomtop">
        <div>
          <span className="live"></span>
          ГОЛОСОВАЯ КОМНАТА
        </div>
        <button className="quiet" onClick={onLeave}>
          Покинуть
        </button>
      </div>

      <GridLayout tracks={tracks} className="tiles">
        {tracks.map((t) => (
          <ParticipantTile
            key={t.participant.identity}
            trackRef={t}
          />
        ))}
      </GridLayout>

      <RoomAudioRenderer />

      <div className="controls">
        <ControlBar
          controls={{
            camera: false,
            screenShare: false,
            microphone: true,
            leave: false
          }}
        />
        <button className="leave" onClick={onLeave}>
          Выйти из комнаты
        </button>
      </div>
    </section>
  );
}

function App() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('main');
  const [connection, setConnection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function join(e) {
    e.preventDefault();

    setBusy(true);
    setError('');

    try {
      const r = await fetch(`${API}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, room })
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data.error || 'Не удалось подключиться'
        );
      }

      setConnection(data);
    } catch (err) {
      setError(err.message || 'Ошибка подключения');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header>
        <div className="brandmark">
          Б<span>35</span>
        </div>

        <div>
          <div className="brand">БРАТВА 35</div>
          <div className="sub">
            СВОЯ ВОЛНА. СВОИ ЛЮДИ.
          </div>
        </div>

        <div className="status">
          <i /> СИСТЕМА ГОТОВА
        </div>
      </header>

      {!connection ? (
        <section className="hero">
          <div className="eyebrow">
            ЗАКРЫТЫЙ ГОЛОСОВОЙ ЧАТ
          </div>

          <h1>
            СВОИ СОБРАЛИСЬ.
            <br />
            <em>ПОРА В ГОЛОС.</em>
          </h1>

          <p className="intro">
            Залетай в комнату, подключай микрофон и
            общайся с кентами хоть с компьютера,
            хоть с iPhone.
          </p>

          <form onSubmit={join} className="joincard">
            <label>
              ТВОЙ НИКНЕЙМ
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например, Шишан"
                maxLength="24"
                required
              />
            </label>

            <label>
              КОМНАТА
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="main"
                maxLength="40"
                required
              />
            </label>

            <button
              disabled={busy}
              className="join"
            >
              {busy ? 'ПОДКЛЮЧАЕМ...' : 'ВОЙТИ В ГОЛОС'}
              <b>↗</b>
            </button>

            {error && (
              <div className="error">
                {error}
              </div>
            )}
          </form>

          <div className="features">
            <span>● ГОЛОС В РЕАЛЬНОМ ВРЕМЕНИ</span>
            <span>● КОМНАТЫ ПО НАЗВАНИЮ</span>
            <span>● ПК + IPHONE</span>
          </div>
        </section>
      ) : (
        <LiveKitRoom
          token={connection.token}
          serverUrl={connection.url}
          connect
          audio
          video={false}
          onConnected={() => {
            setError('');
          }}
          onError={(err) => {
            console.error('LiveKit error:', err);
            setError(
              'Ошибка LiveKit: ' + err.message
            );
            setConnection(null);
          }}
          onDisconnected={(reason) => {
            setError(
              'Соединение прервано: ' +
              (reason || 'причина неизвестна')
            );
            setConnection(null);
          }}
          onMediaDeviceFailure={(failure) => {
            setError(
              'Ошибка микрофона: ' + failure
            );
          }}
        >
          <RoomView
            onLeave={() => {
              setConnection(null);
            }}
          />
        </LiveKitRoom>
      )}

      <footer>
        <span>БРАТВА 35</span>
        <span>БЕТА · ДЛЯ СВОЕЙ КОМПАНИИ</span>
      </footer>
    </main>
  );
}

createRoot(
  document.getElementById('root')
).render(<App />);
