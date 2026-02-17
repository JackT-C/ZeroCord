'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

interface DM {
  id: string;
  username: string;
  status: 'ONLINE' | 'OFFLINE';
}

interface Props {
  selectedDM: DM | null;
  onSelectDM: (dm: DM) => void;
}

export default function DMList({ selectedDM, onSelectDM }: Props) {
  const { token } = useAuthStore();
  const [friends, setFriends] = useState<DM[]>([]);

  useEffect(() => {
    fetchFriends();
  }, [token]);

  const fetchFriends = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const friendsList = data.map((f: any) => f.friend);
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  return (
    <div className="w-60 bg-primary-100 dark:bg-primary-900 flex flex-col">
      <div className="h-12 px-4 flex items-center border-b border-primary-300 dark:border-primary-800 font-semibold">
        Direct Messages
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {friends.map((friend) => (
          <button
            key={friend.id}
            onClick={() => onSelectDM(friend)}
            className={`w-full flex items-center space-x-3 px-2 py-2 rounded hover:bg-accent-100 dark:hover:bg-primary-800 ${
              selectedDM?.id === friend.id
                ? 'bg-accent-200 dark:bg-primary-800'
                : ''
            }`}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white font-semibold text-xs">
                {friend.username.charAt(0).toUpperCase()}
              </div>
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-primary-100 dark:border-primary-900 rounded-full ${
                  friend.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'
                }`}
              />
            </div>
            <span className="text-sm">{friend.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
