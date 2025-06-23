import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, Note } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean; // Este isLoading es para la respuesta del LLM
  onSendMessage: (message: string, relevantNotes?: Note[]) => void;
  onClearChat: () => void;
  onSearch: (query: string, limit?: number) => Promise<SearchResult[]>; // Actualizado
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading, // isLoading para el LLM
  onSendMessage,
  onClearChat,
  onSearch,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isContextSearching, setIsContextSearching] = useState(false); // Nuevo estado para búsqueda de contexto

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => { // Convertido a async
    e.preventDefault();
    if (!input.trim() || isLoading || isContextSearching) return;

    setIsContextSearching(true); // Iniciar búsqueda de contexto
    let relevantNotes: Note[] = [];
    try {
      // Search for relevant notes
      const searchResults = await onSearch(input, 5); // Límite de 5 notas para contexto
      relevantNotes = searchResults.map(result => result.note);
    } catch (error) {
      console.error("Error fetching context notes for chat:", error);
      // Continuar sin notas de contexto si la búsqueda falla
    } finally {
      setIsContextSearching(false); // Finalizar búsqueda de contexto
    }

    onSendMessage(input, relevantNotes);
    setInput('');
  };

  // const suggestedQueries = [
  //   "Dame un plan completo de dieta, ejercicio y suplementación para maximizar mi testosterona",
  //   "¿Cuáles son las mejores estrategias de productividad según mis notas?",
  //   "Resumir los conceptos clave sobre inversiones y finanzas personales",
  //   "¿Qué técnicas de aprendizaje he documentado que funcionan mejor?"
  // ];
  const suggestedQueries: string[] = []; // Reemplazado con array vacío


  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-500">Powered by your knowledge base</p>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="p-4 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full w-16 h-16 mx-auto mb-6">
                <Lightbulb className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                ¡Hola! Soy tu asistente de IA personal
              </h3>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Puedo ayudarte a encontrar información específica en tu base de conocimiento 
                y responder preguntas complejas basándome en tus notas de Obsidian.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                {suggestedQueries.map((query, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setInput(query)}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <p className="text-sm text-gray-700 line-clamp-2">{query}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-secondary-500 text-white'
                }`}>
                  {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                
                <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-4 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}>
                    {message.type === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm max-w-none"
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source) => (
                          <div
                            key={source.id}
                            className="flex items-center space-x-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                          >
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-700 font-medium">{source.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="flex space-x-3 max-w-3xl">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary-500 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hazme una pregunta sobre tu base de conocimiento..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;