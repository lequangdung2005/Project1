import React from 'react';
import { Home, Library, Music2, Sparkles, TrendingUp } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: View.HOME, label: 'Home', icon: Home },
    { id: View.LIBRARY, label: 'Your Library', icon: Library },
    { id: View.RECOMMENDATIONS, label: 'Recommendations', icon: TrendingUp },
    { id: View.AI_CHAT, label: 'AI Assistant', icon: Sparkles },
  ];

  return (
    <aside className="w-64 bg-zinc-950 flex flex-col h-full border-r border-zinc-800">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8 text-emerald-500">
          <Music2 size={32} />
          <span className="text-2xl font-bold text-white tracking-tight">StreamFlow</span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-emerald-500' : 'group-hover:text-white'}
                />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-zinc-800">
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-2">My Playlists</p>
          <ul className="space-y-2">
            <li className="text-sm text-zinc-300 hover:text-white cursor-pointer truncate">Favorites</li>
            <li className="text-sm text-zinc-300 hover:text-white cursor-pointer truncate">Driving Mix</li>
            <li className="text-sm text-zinc-300 hover:text-white cursor-pointer truncate">Focus Flow</li>
            <li className="text-sm text-zinc-300 hover:text-white cursor-pointer truncate">Late Night Jazz</li>
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;