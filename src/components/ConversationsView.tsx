import React, { useState } from 'react';
import { Search, ChevronDown, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  date: string;
}

export const ConversationsView: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([
    {
      id: '1',
      name: 'Anthony Moreno Gte',
      lastMessage: 'Hey, I am inviting you to join me at the b...',
      date: '2026/4/27'
    },
    {
      id: '2',
      name: 'Mio Work',
      lastMessage: 'Somos Heavenly Dreams una empresa jov...',
      date: '2026/4/27'
    }
  ]);

  return (
    <div className="flex h-full bg-brand-bg">
      {/* Left Sidebar - Chat List */}
      <div className="w-[350px] border-r border-border-color bg-[#0c121f] flex flex-col h-full">
        {/* Filters */}
        <div className="p-4 border-b border-border-color flex items-center gap-2">
           <div className="flex-1 bg-brand-surface/80 border border-border-color rounded-lg px-3 py-1.5 flex items-center justify-between text-gray-400 text-sm cursor-pointer hover:border-gray-600 transition-colors">
             <span>Miembro</span>
             <ChevronDown size={14} />
           </div>
           <div className="flex-1 bg-brand-surface/80 border border-border-color rounded-lg px-3 py-1.5 flex items-center justify-between text-gray-400 text-sm cursor-pointer hover:border-gray-600 transition-colors">
             <span>Estado</span>
             <ChevronDown size={14} />
           </div>
           <button className="p-1.5 text-gray-400 hover:text-text-main transition-colors">
             <Search size={16} />
           </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto w-full hide-scrollbar">
           {chats.map(chat => (
             <button
               key={chat.id}
               onClick={() => setSelectedChat(chat.id)}
               className={`w-full p-4 flex gap-3 text-left transition-colors border-b border-border-color/50 hover:bg-brand-surface ${selectedChat === chat.id ? 'bg-brand-surface' : ''}`}
             >
                <div className="w-12 h-12 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center text-text-main">
                  <User size={24} className="opacity-50" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                   <div className="flex justify-between items-center mb-1">
                     <h4 className="text-gray-200 font-medium text-sm truncate pr-2">{chat.name}</h4>
                     <span className="text-xs text-gray-500 whitespace-nowrap">{chat.date}</span>
                   </div>
                   <div className="flex items-center justify-between">
                     <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                     <div className="w-5 h-5 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-400 flex-shrink-0 ml-2">
                       <User size={10} />
                     </div>
                   </div>
                </div>
             </button>
           ))}
        </div>
      </div>

      {/* Right Side - Chat Content (Empty State) */}
      <div className="flex-1 bg-brand-bg flex flex-col items-center justify-center">
         {selectedChat ? (
            <div className="text-center">
              <p className="text-gray-400">Chat Selected: {selectedChat}</p>
              {/* Here we would place ChatThread.tsx or similar chat component if fully implementing */}
              <p className="text-xs text-gray-600 mt-2">Chat UI goes here...</p>
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center opacity-50">
               <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-6 text-gray-500">
                 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                 <polyline points="17 8 12 3 7 8"></polyline>
                 <line x1="12" y1="3" x2="12" y2="15"></line>
               </svg>
               <p className="text-gray-400 text-sm font-medium">Por favor selecciona un chat</p>
            </div>
         )}
      </div>
    </div>
  );
};
