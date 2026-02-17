'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { PlusIcon, HomeIcon } from '@heroicons/react/24/outline';

interface Server {
  id: string;
  name: string;
  channels: any[];
}

interface Props {
  selectedServer: Server | null;
  onSelectServer: (server: Server) => void;
  onShowFriends: () => void;
  onShowDMs: () => void;
}

export default function ServerList({ selectedServer, onSelectServer, onShowFriends, onShowDMs }: Props) {
  const { token, logout } = useAuthStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    fetchServers();
  }, [token]);

  const fetchServers = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/servers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServers(data);
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  };

  const createServer = async (name: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const newServer = await response.json();
        setServers([...servers, newServer]);
        setShowCreateModal(false);
        onSelectServer(newServer);
      }
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  const joinServer = async (inviteCode: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/servers/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode }),
      });

      if (response.ok) {
        const server = await response.json();
        setServers([...servers, server]);
        setShowJoinModal(false);
        onSelectServer(server);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Failed to join server:', error);
    }
  };

  return (
    <>
      <div className="w-20 bg-primary-800 flex flex-col items-center py-3 space-y-2">
        {/* Home Button */}
        <button
          onClick={onShowFriends}
          className="w-14 h-14 rounded-full bg-primary-700 hover:bg-accent-500 transition-colors flex items-center justify-center"
          title="Friends"
        >
          <HomeIcon className="w-6 h-6 text-white" />
        </button>

        <div className="w-10 h-px bg-primary-700" />

        {/* Server Icons */}
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => onSelectServer(server)}
            className={`w-14 h-14 rounded-full transition-all flex items-center justify-center text-white font-semibold ${
              selectedServer?.id === server.id
                ? 'bg-accent-500 rounded-2xl'
                : 'bg-primary-700 hover:bg-primary-600 hover:rounded-2xl'
            }`}
            title={server.name}
          >
            {server.name.charAt(0).toUpperCase()}
          </button>
        ))}

        {/* Add Server Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-14 h-14 rounded-full bg-primary-700 hover:bg-green-600 transition-colors flex items-center justify-center"
          title="Create Server"
        >
          <PlusIcon className="w-6 h-6 text-white" />
        </button>

        {/* Join Server Button */}
        <button
          onClick={() => setShowJoinModal(true)}
          className="w-14 h-14 rounded-full bg-primary-700 hover:bg-blue-600 transition-colors flex items-center justify-center text-white text-xl font-bold"
          title="Join Server"
        >
          ↓
        </button>

        {/* Logout Button (at bottom) */}
        <div className="flex-1" />
        <button
          onClick={logout}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center text-white text-sm font-semibold"
          title="Logout"
        >
          Exit
        </button>
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <CreateServerModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createServer}
        />
      )}

      {/* Join Server Modal */}
      {showJoinModal && (
        <JoinServerModal
          onClose={() => setShowJoinModal(false)}
          onJoin={joinServer}
        />
      )}
    </>
  );
}

function CreateServerModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-primary-800 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Create Server</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Server name"
          className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-primary-700 dark:border-primary-600"
          autoFocus
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-primary-600 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim())}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinServerModal({ onClose, onJoin }: { onClose: () => void; onJoin: (code: string) => void }) {
  const [code, setCode] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-primary-800 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Join Server</h2>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Invite code"
          className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-primary-700 dark:border-primary-600"
          autoFocus
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-primary-600 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => code.trim() && onJoin(code.trim())}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
