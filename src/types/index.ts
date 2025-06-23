export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created: Date;
  modified: Date;
  path: string;
  wordCount: number;
}

export interface SearchResult {
  note: Note;
  relevance: number;
  matches: string[];
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Note[];
  isError?: boolean; // Optional: to indicate if the message is an error message
}

export interface KnowledgeStats {
  totalNotes: number;
  totalWords: number;
  uniqueTags: number;
  lastUpdated: Date | null; // Modificado para aceptar null
}