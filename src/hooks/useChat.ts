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
      // Simulate AI response - in a real app, this would call your GPT API
      await new Promise(resolve => setTimeout(resolve, 1500));

      const aiResponse: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'assistant',
        content: generateMockResponse(content, relevantNotes),
        timestamp: new Date(),
        sources: relevantNotes.slice(0, 3),
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
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

const generateMockResponse = (query: string, notes: Note[]): string => {
  const sourceContext = notes.length > 0 
    ? `Basándome en tu base de conocimiento (${notes.length} notas relevantes), ` 
    : '';

  if (query.toLowerCase().includes('testosterona')) {
    return `${sourceContext}aquí tienes un plan completo para maximizar tu testosterona:

**DIETA:**
• Grasas saludables (25-30% calorías): aguacate, frutos secos, aceite de oliva
• Proteína de calidad (1.6-2.2g/kg): carnes magras, pescado, huevos
• Carbohidratos complejos: avena, quinoa, batata
• Micronutrientes clave: zinc, vitamina D, magnesio

**EJERCICIO:**
• Entrenamiento de fuerza 3-4x/semana (ejercicios compuestos)
• HIIT 2x/semana (15-20 min)
• Descanso adecuado entre sesiones (48-72h músculos grandes)

**SUPLEMENTACIÓN:**
• Vitamina D3: 2000-4000 UI/día
• Zinc: 15-30mg/día
• Magnesio: 400-600mg/día
• Creatina: 3-5g/día
• Ashwagandha: 300-600mg/día

**ESTILO DE VIDA:**
• Sueño: 7-9 horas de calidad
• Gestión del estrés: meditación, yoga
• Exposición solar moderada
• Evitar alcohol y procesados

Este plan está basado en evidencia científica y adaptado según tus notas de nutrición y entrenamiento.`;
  }

  return `${sourceContext}he analizado tu consulta y encontré información relevante en tu base de conocimiento. Aquí tienes una respuesta completa basada en tus notas:

Esta respuesta integra información de múltiples fuentes de tu vault de Obsidian para darte la información más precisa y personalizada posible. 

¿Te gustaría que profundice en algún aspecto específico o que busque información adicional en tus notas?`;
};