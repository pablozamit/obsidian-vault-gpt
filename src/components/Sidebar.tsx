import React from 'react';
import { 
  Brain, 
  Cloud, 
  Search, 
  MessageSquare, 
  BarChart3, 
  Settings,
  BookOpen,
  Zap,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats: {
    totalNotes: number;
    totalWords: number;
    uniqueTags: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, stats }) => {
  const menuItems = [
    { id: 'sync', icon: Cloud, label: 'Google Drive Sync', color: 'text-blue-600' },
    { id: 'chat', icon: MessageSquare, label: 'AI Chat (Test)', color: 'text-primary-600' },
    { id: 'search', icon: Search, label: 'Search', color: 'text-accent-600' },
    { id: 'library', icon: BookOpen, label: 'Library', color: 'text-purple-600' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', color: 'text-green-600' },
    { id: 'custom-gpt', icon: Bot, label: 'Custom GPT Setup', color: 'text-purple-600' },
    { id: 'settings', icon: Settings, label: 'Settings', color: 'text-gray-600' },
  ];

  return (
    <motion.div 
      className="w-64 bg-white border-r border-gray-200 flex flex-col h-full"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ObsidianLM</h1>
            <p className="text-sm text-gray-500">AI Knowledge Assistant</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 m-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Zap className="h-4 w-4 text-primary-600" />
          <span className="text-sm font-medium text-gray-700">Knowledge Base</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.totalNotes}</div>
            <div className="text-xs text-gray-500">Notes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-secondary-600">{stats.totalWords.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Words</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-accent-600">{stats.uniqueTags}</div>
            <div className="text-xs text-gray-500">Tags</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <motion.li key={item.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${isActive ? item.color : 'text-gray-400'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-3 text-white text-center">
          <div className="text-sm font-medium">Ready to sync?</div>
          <div className="text-xs opacity-90">Connect your Google Drive</div>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;