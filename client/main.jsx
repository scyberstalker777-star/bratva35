
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useRoomContext,
  useLocalParticipant,
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import './style.css';

const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

function AudioSettings() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [noise, setNoise] = useState(true);
  const [micVolume, setMicVolume] = useState(100);
  const [speakerVolume, setSpeakerVolume] = useState(100);

  const tracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: true
  });

  useEffect(() => {
    async function updateNoise() {
      try {
        await localParticipant.setMicrophoneEnabled(true, {
          noiseSuppression: noise,
          echoCancellation: true,
          autoGainControl: true
        });
      } catch (err) {
        console.error('Audio settings error:', err);
      }
    }

    updateNoise();
  }, [noise, localParticipant]);

  useEffect(() => {
    const publication = localParticipant.getTrackPublication(
      Track.Source.Microphone
    );

    const track = publication?.audioTrack;
    if (!track) return;

    const sender = track.sender;
    if (!sender) return;

    const params = sender.getParameters();
    if (!params.encodings?.length) return;

    params.encodings[0].maxBitrate =
      micVolume === 0 ? 1 : undefined;

    sender.setParameters(params).catch(console.error);
  }, [micVolume, localParticipant]);

  useEffect(() => {
    tracks.forEach(({ publication, participant }) => {
      if (participant.identity === localParticipant.identity) return;

      const audioTrack = publication?.audioTrack;
      if (audioTrack) {
        audioTrack.setVolume(speakerVolume / 100);
      }
    });
  }, [speakerVolume, tracks, localParticipant]);

  return (
    <div className="audio-settings">
      <h3>НАСТРОЙКИ ЗВУКА</h3>

      <label className="audio-toggle">
        <span>Шумоподавление микрофона</span>
        <input
          type="checkbox"
          checked={noise}
          onChange={(e) => setNoise(e.target.checked)}
        />
      </label>

      <label className="audio-slider">
        <span>
          Громкость микрофона <b>{micVolume}%</b>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={micVolume}
          onChange={(e) => setMicVolume(Number(e.target.value))}
        />
      </label>

      <label className="audio-slider">
        <span>
          Громкость собеседников <b>{speakerVolume}%</b>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={speakerVolume}
          onChange={(e) => setSpeakerVolume(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

function RoomView({ onLeave }) {
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

      <div className="room-content">
        <h2>БРАТВА 35</h2>
        <p>Ты находишься в голосовой комнате.</p>
        <p>Подключай микрофон и общайся с братвой!</p>
      </div>

      <AudioSettings />
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, room })
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.error || 'Не удалось подключиться');
      }

      setConnection(data);
    } catch (err) {
      setError(err.message || 'Ошибка подключения');
    } finally {
      setBusy(false);
    }
  }

  function leaveRoom() {
    setConnection(null);
    setError('');
  }

  return (
    <main className="shell">
      <header>
        <div className="brandmark">Б<span>35</span></div>
        <div>
          <div className="brand">БРАТВА 35</div>
          <div className="sub">СВОЯ ВОЛНА. СВОИ ЛЮДИ.</div>
        </div>
        <div className="status">
          <i /> СИСТЕМА ГОТОВА
        </div>
      </header>

      {!connection ? (
        <section className="hero">
          <div className="eyebrow">ЗАКРЫТЫЙ ГОЛОСОВОЙ ЧАТ</div>
          <h1>СВОИ СОБРАЛИСЬ.<br /><em>ПОРА В ГОЛОС.</em></h1>
          <p className="intro">
            Залетай в комнату, подключай микрофон
            и общайся с кентами хоть с компьютера,
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

            <button disabled={busy} className="join">
              {busy ? 'ПОДКЛЮЧАЕМ...' : 'ВОЙТИ В ГОЛОС'}
              <b>↗</b>
            </button>

            {error && <div className="error">{error}</div>}
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
          connect={true}
          audio={true}
          video={false}
          options={{
            audioCaptureDefaults: {
              noiseSuppression: true,
              echoCancellation: true,
              autoGainControl: true
            }
          }}
          onError={(err) => {
            console.error('LiveKit error:', err);
            setError('Ошибка LiveKit: ' + err.message);
            setConnection(null);
          }}
          onDisconnected={(reason) => {
            setConnection(null);
            setError('Соединение прервано: ' + (reason || 'причина неизвестна'));
          }}
          onMediaDeviceFailure={(failure) => {
            console.error('Microphone error:', failure);
            setError('Ошибка микрофона: ' + failure);
          }}
        >
          <RoomView onLeave={leaveRoom} />
        </LiveKitRoom>
      )}

      <footer>
        <span>БРАТВА 35</span>
        <span>БЕТА · ДЛЯ СВОЕЙ КОМПАНИИ</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
