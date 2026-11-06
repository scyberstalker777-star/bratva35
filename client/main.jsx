import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useRoomContext,
  useLocalParticipant
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import { GainAudioProcessor } from '@livekit/track-processors';
import '@livekit/components-styles';
import './style.css';

const API =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

const CHANNELS = [
  {
    id: 'main',
    name: 'ОСНОВНОЙ',
    description: 'Общение и разговоры',
    icon: '🎙️',
    tag: 'ОБЩИЙ КАНАЛ'
  },
  {
    id: 'dota2',
    name: 'DOTA 2',
    description: 'Игры, катки и тактика',
    icon: '🎮',
    tag: 'ИГРОВОЙ КАНАЛ'
  },
  {
    id: 'chill',
    name: 'ОТДЫХ',
    description: 'Свободное общение',
    icon: '🌙',
    tag: 'RELAX'
  }
];

/* ===== АНИМИРОВАННЫЙ ФОН ===== */

function AnimatedBackground() {
  return (
    <>
      <style>{`
        .ambient-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(
              ellipse at 20% 30%,
              rgba(111,65,255,.15),
              transparent 45%
            ),
            radial-gradient(
              ellipse at 80% 70%,
              rgba(0,170,255,.10),
              transparent 45%
            );
        }

        .ambient-bg::before,
        .ambient-bg::after {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          border-radius: 50%;
          filter: blur(90px);
          opacity: .28;
          animation: ambientMove 14s ease-in-out infinite alternate;
          will-change: transform;
        }

        .ambient-bg::before {
          background: #7845ff;
          top: 5%;
          left: -150px;
        }

        .ambient-bg::after {
          background: #176bff;
          bottom: 0;
          right: -150px;
          animation-delay: -7s;
        }

        .ambient-orb {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #b99aff;
          box-shadow: 0 0 14px 3px rgba(151,110,255,.65);
          animation: particleFloat 9s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .ambient-ring {
          position: absolute;
          width: 280px;
          height: 280px;
          border: 1px solid rgba(160,120,255,.13);
          border-radius: 50%;
          top: 48%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow:
            0 0 70px rgba(120,75,255,.09),
            inset 0 0 70px rgba(120,75,255,.07);
          animation: ringPulse 5s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .ambient-ring::before,
        .ambient-ring::after {
          content: "";
          position: absolute;
          inset: 22px;
          border: 1px solid rgba(120,160,255,.12);
          border-radius: 50%;
          animation: ringPulse 5s ease-in-out infinite reverse;
        }

        .ambient-ring::after {
          inset: 48px;
          animation-delay: -2s;
        }

        @keyframes ambientMove {
          from {
            transform: translate(0,0) scale(1);
          }
          to {
            transform: translate(100px,70px) scale(1.3);
          }
        }

        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0);
            opacity: .2;
          }
          50% {
            transform: translateY(-45px);
            opacity: .9;
          }
        }

        @keyframes ringPulse {
          0%, 100% {
            opacity: .45;
            transform: translate(-50%, -50%) scale(.94);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }

        .shell {
          position: relative;
          isolation: isolate;
        }

        .shell > :not(.ambient-bg) {
          position: relative;
          z-index: 1;
        }

        @media (max-width: 600px) {
          .ambient-ring {
            width: 220px;
            height: 220px;
          }

          .ambient-bg::before,
          .ambient-bg::after {
            width: 260px;
            height: 260px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ambient-bg *,
          .ambient-bg::before,
          .ambient-bg::after {
            animation: none !important;
          }
        }
      `}</style>

      <div className="ambient-bg">
        <div className="ambient-ring"></div>

        {Array.from({ length: 18 }, (_, i) => (
          <span
            key={i}
            className="ambient-orb"
            style={{
              left: `${(i * 37 + 7) % 100}%`,
              top: `${(i * 53 + 11) % 100}%`,
              animationDelay: `${i * -0.7}s`,
              animationDuration: `${7 + (i % 5)}s`,
              opacity: 0.3 + (i % 5) * 0.12
            }}
          />
        ))}
      </div>
    </>
  );
}

/* ===== УЧАСТНИКИ КОМНАТЫ ===== */

function ParticipantsPanel() {
  const room = useRoomContext();
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const updateParticipants = () => {
      const all = [
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values())
      ];

      setParticipants(
        all.map(participant => ({
          identity: participant.identity,
          name: participant.name || participant.identity,
          isLocal: participant.isLocal
        }))
      );
    };

    updateParticipants();

    room.on(RoomEvent.ParticipantConnected, updateParticipants);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
    room.on(RoomEvent.ParticipantNameChanged, updateParticipants);

    return () => {
      room.off(RoomEvent.ParticipantConnected, updateParticipants);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.off(RoomEvent.ParticipantNameChanged, updateParticipants);
    };
  }, [room]);

  return (
    <div className="participants-panel" style={{
      marginTop: '24px',
      padding: '20px',
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.045)',
      border: '1px solid rgba(255,255,255,0.1)',
      textAlign: 'left'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <strong style={{ fontSize: '15px', letterSpacing: '1px' }}>
          УЧАСТНИКИ КОМНАТЫ
        </strong>

        <span style={{
          color: '#55d68b',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          ● {participants.length} онлайн
        </span>
      </div>

      {participants.length === 0 ? (
        <p>Пока никого нет</p>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {participants.map(participant => (
            <div
              key={participant.identity}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '9px',
                background: 'rgba(255,255,255,0.04)'
              }}
            >
              <span style={{ color: '#55d68b', fontSize: '12px' }}>
                ●
              </span>

              <span style={{ fontWeight: 600 }}>
                {participant.name}
              </span>

              {participant.isLocal && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  opacity: 0.55
                }}>
                  ЭТО ТЫ
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== НАСТРОЙКИ ЗВУКА ===== */

function AudioSettings() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [noise, setNoise] = useState(true);
  const [micVolume, setMicVolume] = useState(100);
  const [speakerVolume, setSpeakerVolume] = useState(100);
  const [audioReady, setAudioReady] = useState(false);

  const processorRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function setup() {
      const publication = localParticipant.getTrackPublication(
        Track.Source.Microphone
      );
      const track = publication?.audioTrack;

      if (!track) {
        if (active) setAudioReady(false);
        return;
      }

      try {
        if (trackRef.current !== track) {
          processorRef.current = null;
          trackRef.current = track;
        }

        if (!processorRef.current) {
          const processor = new GainAudioProcessor({
            gainValue: micVolume / 100
          });

          await track.setProcessor(processor);

          if (!active) {
            await track.stopProcessor();
            return;
          }

          processorRef.current = processor;
        } else {
          processorRef.current.setGain(micVolume / 100);
        }

        const mediaTrack = track.mediaStreamTrack;

        if (mediaTrack) {
          await mediaTrack.applyConstraints({
            noiseSuppression: noise,
            echoCancellation: true,
            autoGainControl: false
          });
        }

        if (active) setAudioReady(true);
      } catch (err) {
        console.error('Audio processing error:', err);
        if (active) setAudioReady(false);
      }
    }

    setup();

    return () => {
      active = false;
    };
  }, [noise, micVolume, localParticipant]);

  useEffect(() => {
    const updateSpeakers = () => {
      room.remoteParticipants.forEach(participant => {
        participant.audioTrackPublications.forEach(publication => {
          const track = publication.audioTrack;
          if (track) {
            track.setVolume(speakerVolume / 100);
          }
        });
      });
    };

    updateSpeakers();
    room.on('trackSubscribed', updateSpeakers);

    return () => {
      room.off('trackSubscribed', updateSpeakers);
    };
  }, [room, speakerVolume]);

  return (
    <div className="audio-settings">
      <h3>НАСТРОЙКИ ЗВУКА</h3>

      <label className="audio-toggle">
        <span>Шумоподавление микрофона</span>
        <input
          type="checkbox"
          checked={noise}
          onChange={e => setNoise(e.target.checked)}
        />
      </label>

      <label className="audio-slider">
        <span>
          Громкость микрофона <b>{micVolume}%</b>
        </span>
        <input
          type="range"
          min="0"
          max="200"
          value={micVolume}
          onChange={e => setMicVolume(Number(e.target.value))}
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
          onChange={e => setSpeakerVolume(Number(e.target.value))}
        />
      </label>

      <div className="audio-status">
        {audioReady
          ? 'АУДИООБРАБОТКА АКТИВНА'
          : 'ПОДКЛЮЧАЕМ ОБРАБОТКУ...'}
      </div>
    </div>
  );
}

/* ===== ГОЛОСОВАЯ КОМНАТА ===== */

function RoomView({ onLeave, channelName }) {
  return (
    <section className="room room-modern">
      <style>{`
        .room-modern {
          width: 100%;
          max-width: 1040px;
          margin: 26px auto;
          padding: clamp(16px, 3vw, 30px);
          box-sizing: border-box;
          color: #f5f4fa;
          background: radial-gradient(circle at 12% 0%, rgba(117, 75, 255, .17), transparent 34%), linear-gradient(145deg, #171522, #0e0d15 72%);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 24px;
          box-shadow: 0 24px 80px rgba(0,0,0,.35);
          text-align: left;
        }
        .room-modern .roomtop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 0 0 20px;
          border-bottom: 1px solid rgba(255,255,255,.09);
          color: #a8a5b8;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }
        .room-modern .roomtop > div { display:flex; align-items:center; gap:10px; }
        .room-modern .live { width:9px; height:9px; display:inline-block; border-radius:50%; background:#55df9a; box-shadow:0 0 14px rgba(85,223,154,.8); }
        .room-modern .quiet { border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); color:#d8d5e4; border-radius:10px; padding:9px 13px; cursor:pointer; }
        .room-modern .room-content { padding:30px 0 20px; text-align:center; }
        .room-modern .room-content h2 { margin:0 0 9px; color:#fff; font-size:clamp(25px,4vw,36px); letter-spacing:2px; }
        .room-modern .room-content p { margin:6px 0; color:#a9a5b8; }
        .room-modern .room-content p:first-of-type { color:#b9a8ff; font-size:13px; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
        .room-modern .participants-panel { margin-top:12px !important; padding:20px !important; border-radius:18px !important; background:rgba(255,255,255,.035) !important; border:1px solid rgba(255,255,255,.085) !important; }
        .room-modern .participants-panel strong { color:#e9e6f3; }
        .room-modern .participants-panel > div:last-child > div { border:1px solid rgba(255,255,255,.055); transition:background .2s ease, transform .2s ease; }
        .room-modern .participants-panel > div:last-child > div:hover { background:rgba(139,112,255,.12) !important; transform:translateY(-1px); }
        .room-modern .audio-settings { margin-top:16px; padding:20px; border:1px solid rgba(255,255,255,.085); border-radius:18px; background:rgba(255,255,255,.035); color:#e9e6f3; }
        .room-modern .audio-settings h3 { margin:0 0 18px; font-size:13px; letter-spacing:1.4px; color:#b9a8ff; }
        .room-modern .audio-toggle, .room-modern .audio-slider { display:flex; justify-content:space-between; align-items:center; gap:16px; margin:14px 0; color:#c9c6d5; font-size:13px; }
        .room-modern .audio-slider { display:block; }
        .room-modern .audio-slider span { display:flex; justify-content:space-between; margin-bottom:9px; }
        .room-modern .audio-slider b { color:#fff; }
        .room-modern .audio-slider input { width:100%; accent-color:#9b7cff; }
        .room-modern .audio-toggle input { accent-color:#9b7cff; width:18px; height:18px; }
        .room-modern .audio-status { margin-top:16px; padding-top:13px; border-top:1px solid rgba(255,255,255,.07); color:#63dba0; font-size:10px; font-weight:800; letter-spacing:1px; }
        .room-modern .controls { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:14px; margin-top:20px; padding:16px; border-radius:18px; background:rgba(0,0,0,.22); }
        .room-modern .controls [data-lk-theme] { --lk-control-bg: rgba(255,255,255,.1); }
        .room-modern .leave { border:0; border-radius:12px; padding:13px 20px; background:linear-gradient(135deg,#8b5cf6,#6542d8); color:white; font-weight:800; cursor:pointer; box-shadow:0 8px 24px rgba(116,75,235,.25); }
        .room-modern .leave:hover { filter:brightness(1.12); transform:translateY(-1px); }
        @media (max-width:600px) {
          .room-modern { margin:14px auto; border-radius:18px; }
          .room-modern .participants-panel { padding:15px !important; }
          .room-modern .audio-settings { padding:16px; }
          .room-modern .controls { padding:12px; }
        }
      `}</style>

      <div className="roomtop">
        <div>
          <span className="live"></span>
          ВЫ В ЭФИРЕ · БРАТВА 35
        </div>
        <button className="quiet" onClick={onLeave}>
          ← Выйти из комнаты
        </button>
      </div>

      <div className="room-content">
        <h2>БРАТВА 35</h2>
        <p>{channelName}</p>
        <p>Свои люди. Свой голос. Своя волна.</p>
      </div>

      <ParticipantsPanel />
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
          Завершить разговор
        </button>
      </div>
    </section>
  );
}

/* ===== ОНЛАЙН-ПАНЕЛЬ ===== */

function OnlinePanel({ users }) {
  return (
    <div style={{
      marginTop: '24px',
      padding: '20px',
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.045)',
      border: '1px solid rgba(255,255,255,0.1)',
      textAlign: 'left'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <strong style={{ fontSize: '15px', letterSpacing: '1px' }}>
          БРАТВА 35 · СЕЙЧАС НА САЙТЕ
        </strong>
        <span style={{
          color: '#55d68b',
          fontWeight: 'bold',
          fontSize: '14px',
          whiteSpace: 'nowrap'
        }}>
          ● {users.length} онлайн
        </span>
      </div>

      {users.length === 0 ? (
        <p style={{ opacity: 0.65, margin: 0 }}>Пока никого нет</p>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {users.map(user => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '9px',
                background: 'rgba(255,255,255,0.04)'
              }}
            >
              <span style={{ color: '#55d68b', fontSize: '12px' }}>●</span>
              <span style={{ fontWeight: 600 }}>{user.name}</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '11px',
                opacity: 0.55
              }}>
                НА САЙТЕ
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== ГЛАВНОЕ ПРИЛОЖЕНИЕ ===== */

function App() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('main');
  const [customRoom, setCustomRoom] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [connection, setConnection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  const presenceIdRef = useRef(
    globalThis.crypto?.randomUUID?.() ||
    `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    let stopped = false;
    let registeredName = '';

    const presenceId = presenceIdRef.current;

    async function updatePresence() {
      const currentName = nameRef.current.trim();

      try {
        if (!currentName) {
          if (registeredName) {
            await fetch(`${API}/presence/leave`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: presenceId })
            });
            registeredName = '';
          }
          return;
        }

        const endpoint = currentName === registeredName
          ? '/presence/heartbeat'
          : '/presence/join';

        const response = await fetch(`${API}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            endpoint === '/presence/join'
              ? { id: presenceId, name: currentName }
              : { id: presenceId }
          )
        });

        if (response.ok && endpoint === '/presence/join') {
          registeredName = currentName;
        }
      } catch (err) {
        console.error('Presence update error:', err);
      }
    }

    async function loadOnlineUsers() {
      try {
        const response = await fetch(`${API}/presence`);
        if (!response.ok) return;
        const data = await response.json();
        if (!stopped) setOnlineUsers(data.users || []);
      } catch (err) {
        console.error('Presence list error:', err);
      }
    }

    updatePresence();
    loadOnlineUsers();

    const presenceTimer = setInterval(updatePresence, 3000);
    const listTimer = setInterval(loadOnlineUsers, 5000);

    return () => {
      stopped = true;
      clearInterval(presenceTimer);
      clearInterval(listTimer);

      if (registeredName) {
        fetch(`${API}/presence/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: presenceId }),
          keepalive: true
        }).catch(() => {});
      }
    };
  }, []);

  const selectedChannel = CHANNELS.find(item => item.id === room);

  async function join(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const finalRoom = customMode
      ? customRoom.trim().toLowerCase()
      : room;

    if (!finalRoom) {
      setError('Введи название комнаты.');
      setBusy(false);
      return;
    }

    try {
      const r = await fetch(`${API}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          room: finalRoom
        })
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.error || 'Не удалось подключиться');
      }

      setConnection({
        ...data,
        channelName: customMode
          ? finalRoom
          : selectedChannel?.name || finalRoom
      });
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

      {/* АНИМАЦИЯ ФОНА */}
      <AnimatedBackground />

      <header>
        <div className="brandmark">
          Б<span>35</span>
        </div>

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
          <div className="eyebrow">
            ЗАКРЫТЫЙ ГОЛОСОВОЙ ЧАТ
          </div>

          <h1>
            СВОИ СОБРАЛИСЬ.
            <br />
            <em>ПОРА В ГОЛОС.</em>
          </h1>

          <p className="intro">
            Выбирай канал, подключай микрофон
            и общайся со своей компанией.
          </p>

          <form onSubmit={join} className="joincard">
            <label>
              ТВОЙ НИКНЕЙМ
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например, Шишан"
                maxLength="24"
                required
              />
            </label>

            <div className="channel-heading">
              ВЫБЕРИ ГОЛОСОВОЙ КАНАЛ
            </div>

            <div className="channel-grid">
              {CHANNELS.map(channel => (
                <button
                  type="button"
                  key={channel.id}
                  className={`channel-card ${
                    !customMode && room === channel.id
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => {
                    setRoom(channel.id);
                    setCustomMode(false);
                    setError('');
                  }}
                >
                  <span className="channel-icon">
                    {channel.icon}
                  </span>
                  <span className="channel-tag">
                    {channel.tag}
                  </span>
                  <strong>{channel.name}</strong>
                  <span className="channel-description">
                    {channel.description}
                  </span>
                  <span className="channel-choice">
                    {!customMode && room === channel.id
                      ? '✓ ВЫБРАН'
                      : 'ВЫБРАТЬ'}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className={`channel-card custom-card ${
                  customMode ? 'selected' : ''
                }`}
                onClick={() => {
                  setCustomMode(true);
                  setError('');
                }}
              >
                <span className="channel-icon">＋</span>
                <span className="channel-tag">СВОЯ КОМНАТА</span>
                <strong>СОЗДАТЬ</strong>
                <span className="channel-description">
                  Назови комнату сам
                </span>
                <span className="channel-choice">
                  {customMode ? '✓ ВЫБРАНО' : 'ВЫБРАТЬ'}
                </span>
              </button>
            </div>

            {customMode && (
              <label>
                НАЗВАНИЕ ТВОЕЙ КОМНАТЫ
                <input
                  value={customRoom}
                  onChange={e => setCustomRoom(e.target.value)}
                  placeholder="Например, friends"
                  maxLength="40"
                  required
                />
              </label>
            )}

            <button
              disabled={busy}
              className="join"
              type="submit"
            >
              {busy ? 'ПОДКЛЮЧАЕМ...' : 'ВОЙТИ В ГОЛОС'}
              <b>↗</b>
            </button>

            {error && <div className="error">{error}</div>}
          </form>

          <OnlinePanel users={onlineUsers} />

          <div className="features">
            <span>● ГОЛОС В РЕАЛЬНОМ ВРЕМЕНИ</span>
            <span>● НЕСКОЛЬКО КАНАЛОВ</span>
            <span>● ПК + IPHONE</span>
          </div>
        </section>
      ) : (
        <LiveKitRoom
          token={connection.token}
          serverUrl={connection.url}
          connect={true}
          audio={{
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: false
          }}
          video={false}
          onError={err => {
            console.error('LiveKit error:', err);
            setError('Ошибка LiveKit: ' + err.message);
            setConnection(null);
          }}
          onDisconnected={reason => {
            setConnection(null);
            setError(
              'Соединение прервано: ' +
              (reason || 'причина неизвестна')
            );
          }}
          onMediaDeviceFailure={failure => {
            console.error('Microphone error:', failure);
            setError('Ошибка микрофона: ' + failure);
          }}
        >
          <RoomView
            onLeave={leaveRoom}
            channelName={connection.channelName}
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

createRoot(document.getElementById('root')).render(<App />);
