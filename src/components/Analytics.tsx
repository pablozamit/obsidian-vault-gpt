import React from 'react';
import { BarChart3, TrendingUp, Calendar, Hash, FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Note, KnowledgeStats } from '../types';

interface AnalyticsProps {
  notes: Note[];
  stats: KnowledgeStats;
}

const Analytics: React.FC<AnalyticsProps> = ({ notes, stats }) => {
  const getTopTags = () => {
    const tagCounts: Record<string, number> = {};
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const getWritingStats = () => {
    const monthlyStats: Record<string, { notes: number; words: number }> = {};
    
    notes.forEach(note => {
      const month = note.created.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = { notes: 0, words: 0 };
      }
      monthlyStats[month].notes += 1;
      monthlyStats[month].words += note.wordCount;
    });

    return Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months
  };

  const topTags = getTopTags();
  const writingStats = getWritingStats();
  const avgWordsPerNote = notes.length > 0 ? Math.round(stats.totalWords / stats.totalNotes) : 0;
  const longestNote = notes.reduce((longest, note) => 
    note.wordCount > longest.wordCount ? note : longest, notes[0] || { wordCount: 0, title: 'N/A' });

  const statCards = [
    {
      title: 'Total Notes',
      value: stats.totalNotes.toLocaleString(),
      icon: FileText,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      change: '' // Antes: '+12% this month'
    },
    {
      title: 'Total Words',
      value: stats.totalWords.toLocaleString(),
      icon: FileText, // Cambiado de Hash a FileText por más semántica
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-50',
      change: notes.length > 0 ? `${avgWordsPerNote} avg per note` : ''
    },
    {
      title: 'Unique Tags',
      value: stats.uniqueTags.toLocaleString(),
      icon: Hash,
      color: 'text-accent-600',
      bgColor: 'bg-accent-50',
      change: '' // Antes: 'Across all notes'
    },
    {
      title: 'Last Updated',
      value: stats.lastUpdated ? stats.lastUpdated.toLocaleDateString() : 'N/A', // Manejar posible undefined/null
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '' // Antes: 'Knowledge base'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Knowledge Analytics</h2>
              <p className="text-gray-600">Insights from your digital brain</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600 mb-2">{stat.title}</div>
              <div className="text-xs text-green-600 font-medium">{stat.change}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Tags */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Most Used Tags</h3>
            <div className="space-y-4">
              {topTags.map(([tag, count], index) => (
                <div key={tag} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">#{tag}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-200 rounded-full h-2 w-20">
                      <div 
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                        style={{ width: `${(count / topTags[0][1]) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Writing Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Writing Activity</h3>
            <div className="space-y-4">
              {writingStats.map(([month, data]) => {
                const monthName = new Date(month + '-01').toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                });
                const maxNotes = Math.max(...writingStats.map(([, d]) => d.notes));
                
                return (
                  <div key={month} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{monthName}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{data.notes} notes</div>
                        <div className="text-xs text-gray-500">{data.words.toLocaleString()} words</div>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 w-16">
                        <div 
                          className="bg-gradient-to-r from-secondary-500 to-accent-500 h-2 rounded-full"
                          style={{ width: `${(data.notes / maxNotes) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Additional Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Longest Note</h3>
            <p className="text-2xl font-bold mb-1">{longestNote.wordCount.toLocaleString()}</p>
            <p className="text-primary-100 text-sm truncate">{longestNote.title}</p>
          </div>

          <div className="bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Average Note</h3>
            <p className="text-2xl font-bold mb-1">{avgWordsPerNote}</p>
            <p className="text-secondary-100 text-sm">words per note</p>
          </div>

          <div className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Knowledge Depth</h3>
            <p className="text-2xl font-bold mb-1">{(stats.totalWords / 1000).toFixed(1)}K</p>
            <p className="text-accent-100 text-sm">total knowledge</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Analytics;