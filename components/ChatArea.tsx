'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useSocketStore } from '@/lib/store/socketStore';
import { PaperAirplaneIcon, PhoneIcon } from '@heroicons/react/24/outline';
import VoiceChannel from '@/components/VoiceChannel';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
  };
}

interface Props {
  channel: any;
  dm: any;
  view: 'servers' | 'friends' | 'dm';
}

export default function ChatArea({ channel, dm, view }: Props) {
  const { token, user } = useAuthStore();
  const { socket } = useSocketStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inVoiceChannel, setInVoiceChannel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channel) {
      fetchMessages();
    } else if (dm) {
      fetchDMs();
    } else {
      setMessages([]);
    }
  }, [channel, dm]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (message: Message) => {
      if (channel && message.channelId === channel.id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('dm:new', (message: Message) => {
      if (dm && (message.senderId === dm.id || message.receiverId === dm.id)) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('message:deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    return () => {
      socket.off('message:new');
      socket.off('dm:new');
      socket.off('message:deleted');
    };
  }, [socket, channel, dm]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!channel || !token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${channel.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchDMs = async () => {
    if (!dm || !token) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dm/${dm.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch DMs:', error);
    }
  };

  const sendMessage = () => {
    if (!inputValue.trim() || !socket) return;

    if (channel) {
      socket.emit('message:send', {
        channelId: channel.id,
        content: inputValue.trim(),
      });
    } else if (dm) {
      socket.emit('dm:send', {
        receiverId: dm.id,
        content: inputValue.trim(),
      });
    }

    setInputValue('');
  };

  const deleteMessage = async (messageId: string) => {
    if (socket && channel) {
      socket.emit('message:delete', { messageId });
    }
  };

  const formatMessage = (content: string) => {
    let formatted = content;
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Inline code
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // URLs
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    return formatted;
  };

  if (view === 'friends') {
    return (
      <div className="flex-1 flex items-center justify-center bg-primary-50 dark:bg-primary-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Friends</h2>
          <p className="text-primary-600 dark:text-primary-400">
            Manage your friends and start conversations
          </p>
        </div>
      </div>
    );
  }

  if (!channel && !dm) {
    return (
      <div className="flex-1 flex items-center justify-center bg-primary-50 dark:bg-primary-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome!</h2>
          <p className="text-primary-600 dark:text-primary-400">
            Select a channel or start a conversation
          </p>
        </div>
      </div>
    );
  }

  // Voice Channel View
  if (channel?.type === 'VOICE') {
    return (
      <div className="flex-1 flex flex-col bg-primary-100 dark:bg-primary-900">
        <div className="h-12 px-4 flex items-center border-b border-primary-300 dark:border-primary-800 font-semibold">
          {channel.name}
        </div>
        <VoiceChannel
          channelId={channel.id}
          isConnected={inVoiceChannel}
          onToggle={() => setInVoiceChannel(!inVoiceChannel)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-primary-100 dark:bg-primary-900">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-primary-300 dark:border-primary-800 font-semibold">
        <span>{channel ? `# ${channel.name}` : dm?.username || 'Direct Message'}</span>
        {dm && (
          <button
            className="p-2 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
            title="Voice Call"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start space-x-3 group">
            <div className="w-10 h-10 rounded-full bg-accent-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {message.sender.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline space-x-2">
                <span className="font-semibold">{message.sender.username}</span>
                <span className="text-xs text-primary-500">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
                {message.sender.id === user?.id && (
                  <button
                    onClick={() => deleteMessage(message.id)}
                    className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div
                className="message-content text-primary-800 dark:text-primary-100 break-words"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-primary-300 dark:border-primary-800">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Message ${channel ? `#${channel.name}` : dm?.username || ''}`}
            className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-primary-800 border border-primary-300 dark:border-primary-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className="p-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400 disabled:bg-accent-300"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-primary-500 mt-2">
          Format: **bold** *italic* `code`
        </p>
      </div>
    </div>
  );
}
