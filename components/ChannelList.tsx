'use client';

import { HashtagIcon, SpeakerWaveIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
}

interface Server {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  channels: Channel[];
}

interface Props {
  server: Server;
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

export default function ChannelList({ server, selectedChannel, onSelectChannel }: Props) {
  const { token, user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const textChannels = server.channels.filter((c) => c.type === 'TEXT');
  const voiceChannels = server.channels.filter((c) => c.type === 'VOICE');
  const isOwner = server.ownerId === user?.id;

  const createChannel = async (name: string, type: 'TEXT' | 'VOICE') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serverId: server.id, name, type }),
      });

      if (response.ok) {
        window.location.reload(); // Simple refresh
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  return (
    <>
      <div className="w-60 bg-primary-100 dark:bg-primary-900 flex flex-col">
        {/* Server Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-primary-300 dark:border-primary-800 font-semibold">
          <span>{server.name}</span>
          <button
            onClick={() => setShowInviteModal(true)}
            className="text-xs px-2 py-1 bg-accent-500 text-white rounded hover:bg-accent-400"
          >
            Invite
          </button>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {/* Text Channels */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase">
              <span>Text Channels</span>
              {isOwner && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hover:text-primary-900 dark:hover:text-white"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {textChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={`w-full flex items-center px-2 py-2 rounded hover:bg-primary-200 dark:hover:bg-primary-800 ${
                  selectedChannel?.id === channel.id
                    ? 'bg-primary-200 dark:bg-primary-800 text-primary-900 dark:text-white'
                    : 'text-primary-700 dark:text-primary-300'
                }`}
              >
                <HashtagIcon className="w-5 h-5 mr-2" />
                <span className="text-sm">{channel.name}</span>
              </button>
            ))}
          </div>

          {/* Voice Channels */}
          <div>
            <div className="px-2 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase">
              Voice Channels
            </div>
            {voiceChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={`w-full flex items-center px-2 py-2 rounded hover:bg-primary-200 dark:hover:bg-primary-800 ${
                  selectedChannel?.id === channel.id
                    ? 'bg-primary-200 dark:bg-primary-800 text-primary-900 dark:text-white'
                    : 'text-primary-700 dark:text-primary-300'
                }`}
              >
                <SpeakerWaveIcon className="w-5 h-5 mr-2" />
                <span className="text-sm">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createChannel}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          inviteCode={server.inviteCode}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}

function CreateChannelModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, type: 'TEXT' | 'VOICE') => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'TEXT' | 'VOICE'>('TEXT');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-primary-800 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Create Channel</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel name"
          className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-primary-700 dark:border-primary-600"
          autoFocus
        />
        <div className="mb-4">
          <label className="flex items-center mb-2">
            <input
              type="radio"
              checked={type === 'TEXT'}
              onChange={() => setType('TEXT')}
              className="mr-2"
            />
            Text Channel
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={type === 'VOICE'}
              onChange={() => setType('VOICE')}
              className="mr-2"
            />
            Voice Channel
          </label>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-primary-600 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), type)}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ inviteCode, onClose }: { inviteCode: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-primary-800 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Invite to Server</h2>
        <p className="text-sm text-primary-600 dark:text-primary-400 mb-2">Share this code:</p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inviteCode}
            readOnly
            className="flex-1 px-4 py-2 border rounded-lg dark:bg-primary-700 dark:border-primary-600"
          />
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-300 dark:bg-primary-600 rounded-lg hover:bg-gray-400"
        >
          Close
        </button>
      </div>
    </div>
  );
}
