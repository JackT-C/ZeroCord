'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useSocketStore } from '@/lib/store/socketStore';
import { UserPlusIcon, CheckIcon, XMarkIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface Friend {
  id: string;
  friend: {
    id: string;
    username: string;
    status: 'ONLINE' | 'OFFLINE';
  };
}

interface FriendRequest {
  id: string;
  user: {
    id: string;
    username: string;
  };
}

interface Props {
  onStartDM: (friend: any) => void;
}

export default function FriendsList({ onStartDM }: Props) {
  const { token } = useAuthStore();
  const { socket } = useSocketStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.on('friend:status', ({ userId, status }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.friend.id === userId ? { ...f, friend: { ...f.friend, status } } : f
        )
      );
    });

    return () => {
      socket.off('friend:status');
    };
  }, [socket]);

  const fetchFriends = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const fetchRequests = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim() || !token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/search?username=${encodeURIComponent(searchTerm)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });

      if (response.ok) {
        setShowAddModal(false);
        setSearchTerm('');
        setSearchResults([]);
        alert('Friend request sent!');
      }
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/accept/${requestId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchFriends();
        fetchRequests();
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/${requestId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Failed to decline request:', error);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm('Remove this friend?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends/${friendshipId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  return (
    <>
      <div className="w-60 bg-primary-100 dark:bg-primary-900 flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b border-primary-300 dark:border-primary-800 font-semibold">
          <span>Friends</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1 hover:bg-primary-200 dark:hover:bg-primary-800 rounded"
          >
            <UserPlusIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {/* Friend Requests */}
          {requests.length > 0 && (
            <div className="mb-4">
              <div className="px-2 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase">
                Pending — {requests.length}
              </div>
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between px-2 py-2 rounded hover:bg-primary-200 dark:hover:bg-primary-800"
                >
                  <span className="text-sm">{request.user.username}</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => acceptRequest(request.id)}
                      className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => declineRequest(request.id)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends List */}
          <div>
            <div className="px-2 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase">
              All Friends — {friends.length}
            </div>
            {friends.map((friendship) => (
              <div
                key={friendship.id}
                className="flex items-center justify-between px-2 py-2 rounded hover:bg-primary-200 dark:hover:bg-primary-800 group"
              >
                <div className="flex items-center space-x-2 flex-1">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white font-semibold text-xs">
                      {friendship.friend.username.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-primary-100 dark:border-primary-900 rounded-full ${
                        friendship.friend.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                  </div>
                  <span className="text-sm">{friendship.friend.username}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => onStartDM(friendship.friend)}
                    className="p-1 text-accent-500 hover:bg-accent-100 dark:hover:bg-accent-900 rounded"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeFriend(friendship.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-primary-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Add Friend</h2>
            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                placeholder="Search username"
                className="flex-1 px-4 py-2 border rounded-lg dark:bg-primary-700 dark:border-primary-600"
                autoFocus
              />
              <button
                onClick={searchUsers}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400"
              >
                Search
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="space-y-2 mb-4">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 border rounded dark:border-primary-600"
                  >
                    <span>{user.username}</span>
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="px-3 py-1 bg-accent-500 text-white rounded hover:bg-accent-400 text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setShowAddModal(false);
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="w-full px-4 py-2 bg-gray-300 dark:bg-primary-600 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
