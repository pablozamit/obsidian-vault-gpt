import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import GoogleDriveSync from './components/GoogleDriveSync';
import SearchInterface from './components/SearchInterface';
import ChatInterface from './components/ChatInterface';
import Library from './components/Library';
import Analytics from './components/Analytics';
import CustomGPTDocs from './components/CustomGPTDocs';
import SettingsView from './components/SettingsView'; // Importar SettingsView
import { useKnowledgeBase } from './hooks/useKnowledgeBase';
import { useChat } from './hooks/useChat';

function App() {
  const [activeTab, setActiveTab] = useState('sync');
  const { notes, stats, isLoading, syncFromGoogleDrive, searchNotes } = useKnowledgeBase();
  const { messages, isLoading: isChatLoading, sendMessage, clearChat } = useChat();

  const renderContent = () => {
    switch (activeTab) {
      case 'sync':
        return (
          <GoogleDriveSync 
            onSync={syncFromGoogleDrive} 
            isLoading={isLoading}
            lastSync={stats.lastUpdated}
            totalFiles={stats.totalNotes}
          />
        );
      case 'search':
        return <SearchInterface onSearch={searchNotes} notes={notes} />;
      case 'library':
        return <Library notes={notes} />;
      case 'analytics':
        return <Analytics notes={notes} stats={stats} />;
      case 'custom-gpt':
        return <CustomGPTDocs />;
      case 'settings':
        return <SettingsView />; // Renderizar SettingsView
      case 'chat':
      default:
        return (
          <ChatInterface
            messages={messages}
            isLoading={isChatLoading}
            onSendMessage={sendMessage}
            onClearChat={clearChat}
            onSearch={searchNotes}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        stats={stats}
      />
      
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full overflow-y-auto"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;