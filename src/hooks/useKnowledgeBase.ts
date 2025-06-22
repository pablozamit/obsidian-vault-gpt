import { useState, useCallback } from 'react';
import { Note, SearchResult, KnowledgeStats } from '../types';

export const useKnowledgeBase = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<KnowledgeStats>({
    totalNotes: 0,
    totalWords: 0,
    uniqueTags: 0,
    lastUpdated: null, // Cambiado de new Date() a null
  });

  const parseGoogleDriveFile = useCallback((file: any): Note => {
    const content = file.content || '';
    const lines = content.split('\n');
    
    // Extract title (first heading or filename)
    let title = file.name.replace('.md', '');
    const firstHeading = lines.find((line: string) => line.startsWith('# '));
    if (firstHeading) {
      title = firstHeading.replace('# ', '');
    }

    // Extract tags
    const tagMatches = content.match(/#\w+/g) || [];
    const tags = [...new Set(tagMatches.map((tag: string) => tag.slice(1)))];

    // Count words
    const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;

    const note: Note = {
      id: file.id || Math.random().toString(36).substr(2, 9),
      title,
      content,
      tags,
      created: new Date(file.modifiedTime || Date.now()),
      modified: new Date(file.modifiedTime || Date.now()),
      path: file.name,
      wordCount,
    };

    return note;
  }, []);

  const syncFromGoogleDrive = useCallback(async (files: any[]) => {
    setIsLoading(true);
    
    try {
      const parsedNotes = files
        .filter(file => file.name.endsWith('.md') || file.name.endsWith('.markdown'))
        .map(file => parseGoogleDriveFile(file));

      setNotes(parsedNotes);

      // Update stats
      const allTags = new Set<string>();
      const totalWords = parsedNotes.reduce((sum, note) => {
        note.tags.forEach(tag => allTags.add(tag));
        return sum + note.wordCount;
      }, 0);

      setStats({
        totalNotes: parsedNotes.length,
        totalWords,
        uniqueTags: allTags.size,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Error syncing from Google Drive:', error);
    } finally {
      setIsLoading(false);
    }
  }, [parseGoogleDriveFile]);

  const searchNotes = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];

    const searchTerms = query.toLowerCase().split(' ');
    const results: SearchResult[] = [];

    notes.forEach(note => {
      const titleScore = searchTerms.reduce((score, term) => {
        return score + (note.title.toLowerCase().includes(term) ? 2 : 0);
      }, 0);

      const contentScore = searchTerms.reduce((score, term) => {
        const matches = (note.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
        return score + matches;
      }, 0);

      const tagScore = searchTerms.reduce((score, term) => {
        return score + (note.tags.some(tag => tag.toLowerCase().includes(term)) ? 1 : 0);
      }, 0);

      const totalScore = titleScore + contentScore * 0.5 + tagScore;

      if (totalScore > 0) {
        const matches = searchTerms.filter(term => 
          note.title.toLowerCase().includes(term) || 
          note.content.toLowerCase().includes(term) ||
          note.tags.some(tag => tag.toLowerCase().includes(term))
        );

        results.push({
          note,
          relevance: totalScore,
          matches,
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  }, [notes]);

  // Legacy upload function for backward compatibility
  const uploadFiles = useCallback(async (files: FileList) => {
    // This is now handled by Google Drive sync
    console.log('Upload files called - redirecting to Google Drive sync');
  }, []);

  return {
    notes,
    stats,
    isLoading,
    uploadFiles, // Keep for backward compatibility
    syncFromGoogleDrive,
    searchNotes,
  };
};