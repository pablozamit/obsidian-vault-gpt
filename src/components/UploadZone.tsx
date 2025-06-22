import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadZoneProps {
  onFilesUpload: (files: FileList) => void;
  isLoading: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesUpload, isLoading }) => {
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesUpload(files);
    }
  }, [onFilesUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesUpload(e.target.files);
    }
  }, [onFilesUpload]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Upload Your Obsidian Vault</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Import your Markdown files to create a powerful AI-searchable knowledge base. 
            Upload individual files or entire folders from your Obsidian vault.
          </p>
        </div>

        <motion.div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            isDragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
          } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex flex-col items-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mb-4"></div>
            ) : (
              <Upload className={`h-16 w-16 mb-4 ${isDragOver ? 'text-primary-600' : 'text-gray-400'}`} />
            )}
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isLoading ? 'Processing files...' : 'Drop your files here'}
            </h3>
            
            <p className="text-gray-600 mb-6">
              Or click to browse and select multiple files
            </p>

            <input
              type="file"
              multiple
              accept=".md,.markdown"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isLoading}
            />
            
            <label
              htmlFor="file-upload"
              className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-6 py-3 rounded-lg font-medium hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FileText className="h-5 w-5" />
              <span>Choose Files</span>
            </label>
          </div>
        </motion.div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Supported Formats</h4>
              <p className="text-sm text-amber-700 mt-1">
                Currently supports Markdown files (.md, .markdown). Images and other attachments 
                referenced in your notes will be processed when you connect to Google Drive integration.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">∞</div>
            <div className="text-sm text-gray-600">No file limit</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-secondary-600 mb-1">⚡</div>
            <div className="text-sm text-gray-600">Fast processing</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
            <div className="text-2xl font-bold text-accent-600 mb-1">🔒</div>
            <div className="text-sm text-gray-600">Secure & private</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadZone;