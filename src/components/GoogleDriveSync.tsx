import React, { useState, useEffect, useCallback, useRef } from 'react'; // useCallback, useRef añadidos
import { Cloud, CloudOff, RefreshCw, Settings, CheckCircle, AlertCircle, FolderOpen, FolderSync as Sync, Zap } from 'lucide-react'; // Zap añadido
import { motion, AnimatePresence } from 'framer-motion';

interface GoogleDriveSyncProps {
  onSyncComplete: () => void; // Cambiado de onSync(files[]) a onSyncComplete()
  isLoadingExternally: boolean; // Renombrado de isLoading para evitar confusión
  lastSync?: Date;
  totalFiles: number;
}

const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ 
  onSyncComplete,
  isLoadingExternally,
  lastSync, 
  totalFiles 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [folderPath, setFolderPath] = useState('');

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => { // Renombrado para claridad
    const saved = localStorage.getItem('settings_autoSync');
    return saved ? JSON.parse(saved) : true;
  });
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState<number>(() => { // Renombrado
    const saved = localStorage.getItem('settings_syncInterval');
    return saved ? JSON.parse(saved) : 15;
  });

  const [currentSyncStatus, setCurrentSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle'); // Renombrado
  const [syncDetailedMessage, setSyncDetailedMessage] = useState<string | null>(null); // Renombrado
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';

  // Función para verificar el estado de autenticación de Google
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch(`${backendApiUrl}/auth/status`);
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.authenticated);
        setUserEmail(data.authenticated ? data.email : null);
        if (data.authenticated) {
          const savedConn = localStorage.getItem('gdrive_connection');
          if (savedConn) setFolderPath(JSON.parse(savedConn).folderPath || '');
        }
      } else {
        setIsConnected(false); setUserEmail(null);
      }
    } catch (error) {
      setIsConnected(false); setUserEmail(null);
      console.error('Failed to fetch auth status:', error);
    }
  }, [backendApiUrl]);

  useEffect(() => {
    checkAuthStatus();
    const handleRedirect = () => { if (new URLSearchParams(window.location.search).has('auth_status')) { checkAuthStatus(); window.history.replaceState({}, '', window.location.pathname); }};
    handleRedirect();
    window.addEventListener('popstate', handleRedirect);
    return () => window.removeEventListener('popstate', handleRedirect);
  }, [checkAuthStatus]);

  // Función para obtener el estado de la sincronización del backend
  const fetchSyncStatusFromBackend = useCallback(async () => {
    try {
      const response = await fetch(`${backendApiUrl}/drive/sync_status`);
      const data = await response.json();

      setCurrentSyncStatus(data.status || 'idle');
      setSyncDetailedMessage(data.message || (data.status === 'error' ? data.last_error : null) );

      if (data.status === 'success' || data.status === 'error') {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (data.status === 'success') {
          onSyncComplete(); // Notificar al hook principal que la sincronización (y reindexado) terminó
        }
      }
    } catch (error) {
      console.error("Error fetching sync status:", error);
      setCurrentSyncStatus('error');
      setSyncDetailedMessage('No se pudo obtener el estado de la sincronización.');
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }
  }, [backendApiUrl, onSyncComplete]);

  // Efecto para sondeo de estado de sincronización
  useEffect(() => {
    if (currentSyncStatus === 'syncing') {
      // Iniciar sondeo si no está ya activo
      if (!pollingIntervalRef.current) {
         // Llamar inmediatamente una vez, luego intervalo
        fetchSyncStatusFromBackend();
        pollingIntervalRef.current = setInterval(fetchSyncStatusFromBackend, 3000); // Sondeo cada 3 segundos
      }
    } else {
      // Detener sondeo si no está 'syncing'
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    // Limpieza al desmontar
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [currentSyncStatus, fetchSyncStatusFromBackend]);

  // Sincronización automática (basada en el estado local, que lee de localStorage)
   useEffect(() => {
    let autoSyncTimer: NodeJS.Timeout | null = null;
    if (isConnected && autoSyncEnabled && syncIntervalMinutes > 0 && currentSyncStatus === 'idle') {
      autoSyncTimer = setInterval(() => {
        console.log("Disparando sincronización automática...");
        handleSyncTrigger();
      }, syncIntervalMinutes * 60 * 1000);
    }
    return () => {
      if (autoSyncTimer) clearInterval(autoSyncTimer);
    };
  }, [isConnected, autoSyncEnabled, syncIntervalMinutes, currentSyncStatus, handleSyncTrigger]); // handleSyncTrigger como dependencia

  // Iniciar Sincronización
  const handleSyncTrigger = useCallback(async () => {
    if (!isConnected) {
      setCurrentSyncStatus('error');
      setSyncDetailedMessage('No estás conectado a Google Drive.');
      return;
    }
    if (currentSyncStatus === 'syncing') {
        setSyncDetailedMessage('Una sincronización ya está en progreso.');
        return;
    }

    setCurrentSyncStatus('syncing');
    setSyncDetailedMessage('Iniciando sincronización...');
    
    try {
      const response = await fetch(`${backendApiUrl}/drive/sync`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al iniciar la sincronización.');
      setSyncDetailedMessage(data.message || "Sincronización iniciada en segundo plano.");
      // El useEffect de currentSyncStatus === 'syncing' iniciará el sondeo
    } catch (error: any) {
      setCurrentSyncStatus('error');
      setSyncDetailedMessage(error.message || 'Fallo al iniciar la tarea de sincronización.');
    }
  }, [isConnected, backendApiUrl, currentSyncStatus]);


  const handleConnect = () => { /* ... (como estaba) ... */
    if (folderPath.trim()) localStorage.setItem('gdrive_connection', JSON.stringify({ folderPath }));
    window.location.href = `${backendApiUrl}/auth/google`;
  };
  const handleDisconnect = () => { /* ... (como estaba) ... */
    window.location.href = `${backendApiUrl}/auth/google/logout`;
  };

  const getStatusIcon = () => {
    switch (currentSyncStatus) {
      case 'syncing': return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return isConnected ? <Cloud className="h-5 w-5 text-blue-600" /> : <CloudOff className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (currentSyncStatus) {
      case 'syncing': return syncDetailedMessage || 'Sincronizando...';
      case 'success': return syncDetailedMessage || `Sincronización exitosa. Última: ${lastSync?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Ahora'}`;
      case 'error': return syncDetailedMessage || 'Error en la sincronización';
      default: return userEmail ? `Conectado como ${userEmail}` : (isConnected ? 'Conectado a Google Drive' : 'No conectado');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ... (Resto de la UI sin cambios significativos, pero usando currentSyncStatus, syncDetailedMessage, etc.) ... */}
      {/* Connection Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Estado de Conexión</h3>
                <p className="text-sm text-gray-600 min-h-[20px]">{/* Espacio para mensajes de varias líneas */}
                  {getStatusText()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isConnected && (
                <button
                  onClick={handleSyncTrigger}
                  disabled={currentSyncStatus === 'syncing' || isLoadingExternally}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Sync className="h-4 w-4" />
                  <span>Sincronizar Ahora</span>
                </button>
              )}
              {/* ... Botón de desconectar ... */}
              <button
                onClick={isConnected ? handleDisconnect : handleConnect}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isConnected 
                    ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700' // Estilo para conectar
                }`}
                disabled={!isConnected && !folderPath.trim()} // Deshabilitar conectar si no hay folderPath
              >
                {isConnected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          </div>
          {/* ... Resto de la UI de conexión ... */}
          {isConnected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalFiles}</div>
                <div className="text-sm text-gray-500">Notas en Base de Conocimiento</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncIntervalMinutes}min</div>
                <div className="text-sm text-gray-500">Intervalo Auto-Sync</div>
              </div>
              <div className="text-center">
                <Zap className={`h-6 w-6 mx-auto mb-1 ${autoSyncEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
                <div className="text-sm text-gray-500">{autoSyncEnabled ? 'Auto-Sync ON' : 'Auto-Sync OFF'}</div>
              </div>
            </div>
          )}
        </div>
        {/* ... (UI de configuración de conexión cuando no está conectado) ... */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div /* ... */ className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              {/* ... Contenido como antes ... */}
               <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configuración de Conexión
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="folderPathInput" className="block text-sm font-medium text-gray-700 mb-2"> {/* Cambiado id por claridad */}
                    Ruta de la carpeta en Google Drive (ID)
                  </label>
                  <div className="relative">
                    <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      id="folderPathInput"
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="ID de la carpeta de Google Drive"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Introduce el ID de la carpeta de Google Drive que contiene tu bóveda de Obsidian.
                  </p>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={!folderPath.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Cloud className="h-5 w-5" />
                  <span>Conectar con Google Drive</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* No mostramos la sección "Sync Settings" aquí, ya que se maneja en el panel de SettingsView */}
    </div>
  );
};

export default GoogleDriveSync;