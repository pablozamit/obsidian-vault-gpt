import { useState, useCallback } from 'react';
import { Note, SearchResult, KnowledgeStats } from '../types';

export const useKnowledgeBase = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<KnowledgeStats>({
    totalNotes: 0,
    totalWords: 0,
    uniqueTags: 0,
    lastUpdated: null,
  });

  // Helper para transformar la estructura de nota de la API (de /api/notes o /api/drive/files) a la del frontend
  const transformApiResponseToFrontendNote = (apiNoteData: any): Note => {
    const content = apiNoteData.content || '';
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    // El backend en /api/drive/files devuelve 'modifiedTime', pero /api/notes devuelve 'drive_modified_time' y 'modified_at'
    // Usaremos 'drive_modified_time' si existe, sino 'modifiedTime' (de Drive), sino 'modified_at' (de BD)
    const modifiedDate = apiNoteData.drive_modified_time || apiNoteData.modifiedTime || apiNoteData.modified_at;
    
    return {
      id: apiNoteData.id,
      title: apiNoteData.title,
      content: content,
      tags: apiNoteData.tags ? (Array.isArray(apiNoteData.tags) && apiNoteData.tags.every(t => typeof t === 'string') ? apiNoteData.tags : apiNoteData.tags.map((tag: any) => tag.name || tag)) : [],
      created: new Date(apiNoteData.created_at || apiNoteData.createdTime || Date.now()), // Adaptar a campos de Drive/BD
      modified: new Date(modifiedDate || Date.now()),
      path: apiNoteData.path || `${apiNoteData.title}.md`,
      wordCount: wordCount,
      // sourceUrl: apiNoteData.sourceUrl, // Descomentar si se añade al tipo Note y se usa
    };
  };

  const fetchInitialNotes = useCallback(async (limit: number = 50) => {
    setIsLoading(true);
    try {
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${backendApiUrl}/notes?skip=0&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Error fetching initial notes: ${response.statusText}`);
      }
      const apiNotes: any[] = await response.json();
      const fetchedNotes = apiNotes.map(transformApiResponseToFrontendNote);
      setNotes(fetchedNotes);

      // Actualizar estadísticas (simplificado, el backend debería dar el total real para totalNotes)
      const allTags = new Set<string>();
      let totalWords = 0;
      fetchedNotes.forEach(note => {
        note.tags.forEach(tag => allTags.add(tag));
        totalWords += note.wordCount || 0;
      });
      setStats({
        totalNotes: fetchedNotes.length, // Esto es solo el conteo de las notas cargadas
        totalWords,
        uniqueTags: allTags.size,
        lastUpdated: new Date(),
      });

    } catch (error) {
      console.error('Error fetching initial notes from API:', error);
      setNotes([]); // Limpiar notas en caso de error para no mostrar datos viejos
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialNotes();
  }, [fetchInitialNotes]);

  // syncFromGoogleDrive es llamado por GoogleDriveSync.tsx.
  // El argumento 'driveSyncResponseNotes' es la respuesta del endpoint /api/drive/files,
  // que ya contiene las notas procesadas y guardadas/actualizadas en la BD por el backend.
  const syncFromGoogleDrive = useCallback(async (driveSyncResponseNotes: any[]) => {
    console.log("Syncing from Google Drive, response from backend:", driveSyncResponseNotes);
    setIsLoading(true);
    try {
      // La respuesta de /api/drive/files (pasada como driveSyncResponseNotes)
      // ya está procesada por el backend. Solo necesitamos transformarla al formato del frontend.
      const frontendNotes = driveSyncResponseNotes.map(transformApiResponseToFrontendNote);
      setNotes(frontendNotes); // Actualiza la UI inmediatamente

      // Actualizar estadísticas
      const allTags = new Set<string>();
      let totalWords = 0;
      frontendNotes.forEach(note => {
        note.tags.forEach(tag => allTags.add(tag));
        totalWords += note.wordCount || 0;
      });
      setStats({
        totalNotes: frontendNotes.length,
        totalWords,
        uniqueTags: allTags.size,
        lastUpdated: new Date(),
      });

      // Opcional: Forzar una recarga desde /api/notes para asegurar la vista más actualizada de la BD
      // await fetchInitialNotes(); // Esto recargaría la primera página.
      // Por ahora, confiamos en que la respuesta de /api/drive/files es suficiente para la UI inmediata.

    } catch (error) {
      console.error('Error processing sync response in useKnowledgeBase:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInitialNotes]); // fetchInitialNotes si se usa la recarga opcional

  const searchNotes = useCallback(async (query: string, k: number = 5): Promise<SearchResult[]> => {
    if (!query.trim()) return [];
    setIsLoading(true);

    try {
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
      // El token API debería obtenerse de forma segura, ej. desde una config o estado global si es necesario.
      // Por ahora, si está en .env.example, asumimos que el desarrollador lo puede poner en un .env local para pruebas.
      // Para una app real, esto necesitaría un mejor manejo si el token es dinámico o por usuario.
      const apiBearerToken = import.meta.env.VITE_API_BEARER_TOKEN || "UN_TOKEN_SECRETO_FUERTE_AQUI"; // Tomado de .env.example como fallback

      const response = await fetch(`${backendApiUrl}/knowledge-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': apiBearerToken, // Enviar el token
        },
        body: JSON.stringify({ query, k }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || `Error ${response.status} from knowledge search`);
      }

      const apiNotes: any[] = await response.json();
      const frontendNotes = apiNotes.map(transformApiResponseToFrontendNote);

      // Para la búsqueda semántica, la "relevancia" viene dada por el orden.
      // Podríamos intentar obtener scores de FAISS si el backend los devolviera.
      const searchResults: SearchResult[] = frontendNotes.map((note, index) => ({
        note,
        relevance: frontendNotes.length - index, // Relevancia simple basada en el orden (mayor es mejor)
        matches: [], // La búsqueda semántica no identifica "matches" de términos exactos
      }));

      return searchResults;

    } catch (error) {
      console.error('Error during knowledge search:', error);
      // Aquí podríamos querer mostrar un mensaje al usuario
      // Por ejemplo, usando un toast o un estado de error en el hook.
      throw error; // Re-lanzar para que el componente que llama pueda manejarlo si es necesario
    } finally {
      setIsLoading(false);
    }
  }, [transformApiResponseToFrontendNote]);

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