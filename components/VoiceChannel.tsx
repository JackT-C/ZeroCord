'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocketStore } from '@/lib/store/socketStore';
import { useAuthStore } from '@/lib/store/authStore';
import SimplePeer from 'simple-peer';
import { MicrophoneIcon, PhoneXMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid';
import { MicrophoneIcon as MicrophoneIconOutline } from '@heroicons/react/24/outline';

interface Props {
  channelId: string;
  isConnected: boolean;
  onToggle: () => void;
}

export default function VoiceChannel({ channelId, isConnected, onToggle }: Props) {
  const { socket } = useSocketStore();
  const { user } = useAuthStore();
  const [isMuted, setIsMuted] = useState(false);
  const [peers, setPeers] = useState<Map<string, SimplePeer.Instance>>(new Map());
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (isConnected) {
      joinVoiceChannel();
    } else {
      leaveVoiceChannel();
    }

    return () => {
      leaveVoiceChannel();
    };
  }, [isConnected]);

  useEffect(() => {
    if (!socket) return;

    socket.on('voice:user-joined', ({ userId }) => {
      if (userId !== user?.id) {
        setConnectedUsers((prev) => [...prev, userId]);
        createPeer(userId, true);
      }
    });

    socket.on('voice:user-left', ({ userId }) => {
      setConnectedUsers((prev) => prev.filter((id) => id !== userId));
      const peer = peers.get(userId);
      if (peer) {
        peer.destroy();
        setPeers((prev) => {
          const newPeers = new Map(prev);
          newPeers.delete(userId);
          return newPeers;
        });
      }
      const audio = audioRefs.current.get(userId);
      if (audio) {
        audio.srcObject = null;
        audioRefs.current.delete(userId);
      }
    });

    socket.on('voice:signal', ({ from, signal }) => {
      const peer = peers.get(from);
      if (peer) {
        peer.signal(signal);
      } else {
        createPeer(from, false, signal);
      }
    });

    return () => {
      socket.off('voice:user-joined');
      socket.off('voice:user-left');
      socket.off('voice:signal');
    };
  }, [socket, peers]);

  const joinVoiceChannel = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      if (socket) {
        socket.emit('voice:join', { channelId });
      }
    } catch (error) {
      console.error('Failed to get media stream:', error);
      alert('Failed to access microphone');
      onToggle();
    }
  };

  const leaveVoiceChannel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    peers.forEach((peer) => peer.destroy());
    setPeers(new Map());
    setConnectedUsers([]);

    audioRefs.current.forEach((audio) => {
      audio.srcObject = null;
    });
    audioRefs.current.clear();

    if (socket) {
      socket.emit('voice:leave', { channelId });
    }
  };

  const createPeer = (userId: string, initiator: boolean, signal?: SimplePeer.SignalData) => {
    if (!streamRef.current || !socket) return;

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: streamRef.current,
    });

    peer.on('signal', (data) => {
      socket.emit('voice:signal', {
        to: userId,
        signal: data,
        channelId,
      });
    });

    peer.on('stream', (stream) => {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.autoplay = true;
      audioRefs.current.set(userId, audio);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    if (signal) {
      peer.signal(signal);
    }

    setPeers((prev) => new Map(prev).set(userId, peer));
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-8">Voice Channel</h2>

        {/* Connected Users */}
        <div className="bg-white dark:bg-primary-800 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase mb-4">
            Connected — {connectedUsers.length + (isConnected ? 1 : 0)}
          </h3>
          <div className="space-y-2">
            {isConnected && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-accent-500 flex items-center justify-center text-white font-semibold">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{user?.username} (You)</span>
                {isMuted && <span className="text-xs text-red-500">Muted</span>}
              </div>
            )}
            {connectedUsers.map((userId) => (
              <div key={userId} className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                  U
                </div>
                <span>User {userId.substring(0, 8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {isConnected ? (
            <>
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full ${
                  isMuted
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary-700 hover:bg-primary-600'
                } text-white transition-colors`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MicrophoneIconOutline className="w-6 h-6" />
                ) : (
                  <MicrophoneIcon className="w-6 h-6" />
                )}
              </button>
              <button
                onClick={onToggle}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                title="Leave"
              >
                <PhoneXMarkIcon className="w-6 h-6" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              className="px-8 py-4 rounded-full bg-accent-500 hover:bg-accent-400 text-white font-semibold transition-colors flex items-center space-x-2"
            >
              <SpeakerWaveIcon className="w-6 h-6" />
              <span>Join Voice Channel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
