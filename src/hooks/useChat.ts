import { useState, useCallback } from 'react';
import { ChatMessage, Note } from '../types';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string, relevantNotes: Note[] = []) => {
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const requestBody = {
        message: content,
        relevant_notes_content: relevantNotes.map(note => note.content).slice(0, 5) // Enviar contenido de hasta 5 notas
      };

      // Obtener la URL del backend desde las variables de entorno de Vite
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

      const response = await fetch(`${backendApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status} from AI service`);
      }

      const data = await response.json();

      const aiResponse: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        sources: relevantNotes.slice(0, 3), // Mantener las fuentes como antes
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorResponse: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'assistant',
        content: `Lo siento, ocurrió un error al procesar tu solicitud: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
  };
};

// generateMockResponse ya no es necesaria ya que llamamos a la API real.
// Se puede eliminar o comentar si se desea mantener como referencia.
/*
const generateMockResponse = (query: string, notes: Note[]): string => {
  const sourceContext = notes.length > 0 
    ? `Basándome en tu base de conocimiento (${notes.length} notas relevantes), ` 
    : '';

  if (query.toLowerCase().includes('testosterona')) {
    return `${sourceContext}aquí tienes un plan completo para maximizar tu testosterona:
    ... (contenido anterior) ...
Este plan está basado en evidencia científica y adaptado según tus notas de nutrición y entrenamiento.`;
  }

  return `${sourceContext}he analizado tu consulta y encontré información relevante en tu base de conocimiento. Aquí tienes una respuesta completa basada en tus notas:
    ... (contenido anterior) ...
¿Te gustaría que profundice en algún aspecto específico o que busque información adicional en tus notas?`;
};
*/