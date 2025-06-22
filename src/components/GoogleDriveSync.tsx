import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Settings, CheckCircle, AlertCircle, FolderOpen, FolderSync as Sync } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GoogleDriveSyncProps {
  onSync: (files: any[]) => void;
  isLoading: boolean;
  lastSync?: Date;
  totalFiles: number;
}

const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ 
  onSync, 
  isLoading, 
  lastSync, 
  totalFiles 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [syncInterval, setSyncInterval] = useState(5); // minutes
  const [autoSync, setAutoSync] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Check if already connected
    // TODO: Re-evaluate gdrive_connection storage once OAuth is implemented
    const savedConnection = localStorage.getItem('gdrive_connection');
    if (savedConnection) {
      const connection = JSON.parse(savedConnection);
      setIsConnected(true); // This will likely change based on OAuth token presence/validity
      setFolderPath(connection.folderPath);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && autoSync && syncInterval > 0) {
      interval = setInterval(() => {
        handleSync();
      }, syncInterval * 60 * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, autoSync, syncInterval, handleSync]); // Added handleSync to dependencies

  const handleConnect = async () => {
    try {
      // TODO: Implementar lógica real de Google Drive API connection (OAuth 2.0)
      // await new Promise(resolve => setTimeout(resolve, 2000)); // Simulación eliminada
      
      // const connection = {
      //   folderPath: folderPath || '/Obsidian Vault',
      //   accessToken: 'mock_token', // Mock token eliminado
      //   refreshToken: 'mock_refresh_token', // Mock token eliminado
      //   connectedAt: new Date().toISOString()
      // };
      // localStorage.setItem('gdrive_connection', JSON.stringify(connection)); // Se manejará con la lógica real
      // setIsConnected(true); // Se manejará con la lógica real
      // setSyncStatus('success'); // Se manejará con la lógica real
      
      console.log("TODO: Implement Google Drive Connection");
      // Trigger initial sync (esto se moverá a la lógica de conexión exitosa)
      // setTimeout(() => handleSync(), 1000);
    } catch (error) {
      setSyncStatus('error');
      console.error('Failed to connect to Google Drive:', error);
    }
  };

  const handleDisconnect = () => {
    // TODO: Implementar desconexión real si es necesario (ej. invalidar token OAuth)
    localStorage.removeItem('gdrive_connection'); // May remove or change based on OAuth
    setIsConnected(false);
    setSyncStatus('idle');
  };

  const handleSync = useCallback(async () => { // Wrapped in useCallback
    if (!isConnected) {
      console.log("Cannot sync, not connected to Google Drive.");
      return;
    }
    
    setSyncStatus('syncing');
    try {
      // TODO: Implementar obtención real de archivos desde Google Drive API
      // await new Promise(resolve => setTimeout(resolve, 3000)); // Simulación eliminada
      
      // Mock file data eliminado
      // const mockFiles = Array.from({ length: Math.floor(Math.random() * 50) + 100 }, (_, i) => ({
      //   id: `file_${i}`,
      //   name: `Note ${i + 1}.md`,
      //   content: `# Note ${i + 1}\n\nThis is a sample note from your Obsidian vault.\n\n## Key Points\n\n- Important concept ${i + 1}\n- Related idea\n- Action item\n\n#productivity #notes #obsidian`,
      //   modifiedTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      //   size: Math.floor(Math.random() * 5000) + 500
      // }));
      
      console.log("TODO: Implement actual file fetching and call onSync with real files");
      // onSync([]); // Call with empty array for now to avoid breaking 'onSync'
      setSyncStatus('idle'); // Set to idle or success based on actual outcome later
                           // For now, idle to prevent UI showing success for a mock.
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync failed:', error);
    }
  }, [isConnected, onSync]); // Added dependencies for useCallback

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return isConnected ? <Cloud className="h-5 w-5 text-blue-600" /> : <CloudOff className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Sincronizando...';
      case 'success':
        return `Última sincronización: ${lastSync?.toLocaleTimeString() || 'Ahora'}`;
      case 'error':
        return 'Error en la sincronización';
      default:
        return isConnected ? 'Conectado a Google Drive' : 'No conectado';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cloud className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Sincronización Google Drive</h2>
              <p className="text-gray-600">Mantén tu vault de Obsidian siempre actualizado</p>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Estado de Conexión</h3>
                <p className="text-sm text-gray-600">{getStatusText()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isConnected && (
                <button
                  onClick={handleSync}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Sync className="h-4 w-4" />
                  <span>Sincronizar</span>
                </button>
              )}
              
              <button
                onClick={isConnected ? handleDisconnect : () => {}}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isConnected 
                    ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!isConnected}
              >
                {isConnected ? 'Desconectar' : 'Desconectado'}
              </button>
            </div>
          </div>

          {isConnected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalFiles}</div>
                <div className="text-sm text-gray-500">Archivos sincronizados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncInterval}min</div>
                <div className="text-sm text-gray-500">Intervalo de sync</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {autoSync ? 'ON' : 'OFF'}
                </div>
                <div className="text-sm text-gray-500">Sync automático</div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configuración de Conexión
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ruta de la carpeta en Google Drive
                  </label>
                  <div className="relative">
                    <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="/Obsidian Vault"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Especifica la ruta completa de tu carpeta de Obsidian en Google Drive
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={!folderPath.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Cloud className="h-5 w-5" />
                  <span>Conectar con Google Drive</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sync Settings */}
        <AnimatePresence>
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configuración de Sincronización
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Sincronización automática
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    Sincroniza automáticamente los cambios en intervalos regulares
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo de sincronización (minutos)
                  </label>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    disabled={!autoSync}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                  >
                    <option value={1}>1 minuto</option>
                    <option value={5}>5 minutos</option>
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Carpeta configurada</h4>
                    <p className="text-sm text-blue-700 mt-1">{folderPath}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      La aplicación monitoreará esta carpeta y sincronizará automáticamente 
                      todos los archivos .md y sus cambios.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default GoogleDriveSync;