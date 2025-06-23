import React, { useState, useEffect } from 'react';
import { Settings, Save, HardDrive } from 'lucide-react';

// Hook para gestionar el estado en localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  };
  return [storedValue, setValue];
}

const SettingsView: React.FC = () => {
  const [googleDriveFolderId, setGoogleDriveFolderId] = useLocalStorage<string>('googleDriveFolderId', '');
  // El componente GoogleDriveSync ya maneja 'autoSync' y 'syncInterval' en su estado,
  // pero para centralizar, los manejaremos aquí también y pasaremos como props o usaremos un contexto global.
  // Por ahora, los duplicaremos para este panel, y la integración real se haría después.
  const [autoSync, setAutoSync] = useLocalStorage<boolean>('settings_autoSync', true);
  const [syncInterval, setSyncInterval] = useLocalStorage<number>('settings_syncInterval', 15); // en minutos

  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const handleSave = () => {
    // Los valores ya se guardan en localStorage al cambiar gracias a useLocalStorage.
    // Esta función es más para feedback visual.
    setShowSavedMessage(true);
    setTimeout(() => {
      setShowSavedMessage(false);
    }, 2000);
  };

  // Nota: Para que estos settings realmente afecten a GoogleDriveSync,
  // se necesitaría pasar estos valores a GoogleDriveSync o usar un estado global (Context API / Zustand / Redux).
  // Por ahora, este panel solo guarda los valores en localStorage.

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Settings className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600">Configure la aplicación a su gusto.</p>
        </div>
      </div>

      {/* Google Drive Settings */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-1 flex items-center">
          <HardDrive className="h-5 w-5 mr-2 text-gray-500" />
          Google Drive
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Configuraciones para la sincronización con su Google Drive.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="googleDriveFolderId" className="block text-sm font-medium text-gray-700 mb-1">
              ID de la Carpeta de Obsidian Vault
            </label>
            <input
              type="text"
              id="googleDriveFolderId"
              value={googleDriveFolderId}
              onChange={(e) => setGoogleDriveFolderId(e.target.value)}
              placeholder="Ej: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              El ID de la carpeta raíz de su bóveda en Google Drive. El backend debe estar configurado con este ID.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-800 mb-1">Sincronización Automática</h3>
         <p className="text-sm text-gray-500 mb-6">
          Ajustes para la sincronización automática en segundo plano.
        </p>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label htmlFor="autoSync" className="text-sm font-medium text-gray-700">
              Activar sincronización automática
            </label>
            <button
              onClick={() => setAutoSync(!autoSync)}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                autoSync ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span className="sr-only">Activar sincronización automática</span>
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
                  autoSync ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label htmlFor="syncInterval" className="block text-sm font-medium text-gray-700 mb-1">
              Intervalo de sincronización (minutos)
            </label>
            <select
              id="syncInterval"
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              disabled={!autoSync}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-50 disabled:bg-gray-50"
            >
              <option value={5}>5 minutos</option>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end items-center">
        {showSavedMessage && (
          <p className="text-sm text-green-600 mr-4 transition-opacity duration-300">
            ¡Configuración guardada!
          </p>
        )}
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Save className="h-5 w-5" />
          <span>Guardar Configuración</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
