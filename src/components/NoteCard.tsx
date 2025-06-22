import React from 'react';
import { FileText, Calendar, Hash, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  searchMatches?: string[];
  relevanceScore?: number;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, searchMatches, relevanceScore }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getPreview = (content: string, maxLength: number = 200) => {
    // Remove markdown syntax for preview
    const cleanContent = content
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/^[-*+]\s+/gm, '') // Remove list markers
      .trim();

    return cleanContent.length > maxLength 
      ? cleanContent.substring(0, maxLength) + '...'
      : cleanContent;
  };

  return (
    <motion.div
      whileHover={{ y: -2, shadow: '0 10px 25px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-200 transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {note.title}
            </h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(note.modified)}
            </div>
          </div>
        </div>
        
        {relevanceScore && (
          <div className="flex items-center space-x-1 bg-gradient-to-r from-accent-100 to-accent-200 px-2 py-1 rounded-full">
            <Zap className="h-3 w-3 text-accent-600" />
            <span className="text-xs font-medium text-accent-700">
              {Math.round(relevanceScore * 10)}%
            </span>
          </div>
        )}
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3">
        {getPreview(note.content)}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-50 text-secondary-700 border border-secondary-200"
            >
              <Hash className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{note.tags.length - 3} more
            </span>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {note.wordCount.toLocaleString()} words
        </div>
      </div>

      {searchMatches && searchMatches.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Matches:</div>
          <div className="flex flex-wrap gap-1">
            {searchMatches.slice(0, 5).map((match, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-md border border-primary-200"
              >
                {match}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NoteCard;