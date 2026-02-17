'use client';

interface Member {
  user: {
    id: string;
    username: string;
    status: 'ONLINE' | 'OFFLINE';
  };
}

interface Server {
  members: Member[];
}

interface Props {
  server: Server;
}

export default function MemberList({ server }: Props) {
  const onlineMembers = server.members.filter((m) => m.user.status === 'ONLINE');
  const offlineMembers = server.members.filter((m) => m.user.status === 'OFFLINE');

  return (
    <div className="w-60 bg-primary-100 dark:bg-primary-900 border-l border-primary-300 dark:border-primary-800 overflow-y-auto">
      <div className="p-4">
        {/* Online Members */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase mb-2">
            Online — {onlineMembers.length}
          </h3>
          {onlineMembers.map((member) => (
            <div
              key={member.user.id}
              className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-accent-100 dark:hover:bg-primary-800 cursor-pointer"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm">
                  {member.user.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-primary-100 dark:border-primary-900 rounded-full" />
              </div>
              <span className="text-sm">{member.user.username}</span>
            </div>
          ))}
        </div>

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase mb-2">
              Offline — {offlineMembers.length}
            </h3>
            {offlineMembers.map((member) => (
              <div
                key={member.user.id}
                className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-primary-200 dark:hover:bg-primary-800 cursor-pointer opacity-50"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold text-sm">
                    {member.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 border-2 border-primary-100 dark:border-primary-900 rounded-full" />
                </div>
                <span className="text-sm">{member.user.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
