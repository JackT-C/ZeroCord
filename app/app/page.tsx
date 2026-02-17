'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useSocketStore } from '@/lib/store/socketStore';
import ServerList from '@/components/ServerList';
import ChannelList from '@/components/ChannelList';
import ChatArea from '@/components/ChatArea';
import MemberList from '@/components/MemberList';
import FriendsList from '@/components/FriendsList';
import DMList from '@/components/DMList';

export default function AppPage() {
  const router = useRouter();
  const { user, token, checkAuth } = useAuthStore();
  const { connect, disconnect } = useSocketStore();
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [selectedDM, setSelectedDM] = useState<any>(null);
  const [view, setView] = useState<'servers' | 'friends' | 'dm'>('servers');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user && !useAuthStore.getState().isLoading) {
      router.push('/auth/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (token) {
      connect(token);
      return () => disconnect();
    }
  }, [token, connect, disconnect]);

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Server List Sidebar */}
      <ServerList
        selectedServer={selectedServer}
        onSelectServer={(server) => {
          setSelectedServer(server);
          setSelectedChannel(null);
          setSelectedDM(null);
          setView('servers');
        }}
        onShowFriends={() => {
          setView('friends');
          setSelectedServer(null);
          setSelectedChannel(null);
          setSelectedDM(null);
        }}
        onShowDMs={() => {
          setView('dm');
          setSelectedServer(null);
          setSelectedChannel(null);
        }}
      />

      {/* Channel List or Friends/DM List */}
      {view === 'servers' && selectedServer && (
        <ChannelList
          server={selectedServer}
          selectedChannel={selectedChannel}
          onSelectChannel={(channel) => {
            setSelectedChannel(channel);
            setSelectedDM(null);
          }}
        />
      )}

      {view === 'friends' && (
        <FriendsList
          onStartDM={(friend) => {
            setSelectedDM(friend);
            setView('dm');
          }}
        />
      )}

      {view === 'dm' && (
        <DMList
          selectedDM={selectedDM}
          onSelectDM={(dm) => {
            setSelectedDM(dm);
            setSelectedChannel(null);
          }}
        />
      )}

      {/* Main Chat Area */}
      <ChatArea
        channel={selectedChannel}
        dm={selectedDM}
        view={view}
      />

      {/* Member List (only for servers) */}
      {view === 'servers' && selectedServer && (
        <MemberList server={selectedServer} />
      )}
    </div>
  );
}
