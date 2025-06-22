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
}

export interface KnowledgeStats {
  totalNotes: number;
  totalWords: number;
  uniqueTags: number;
  lastUpdated: Date;
}