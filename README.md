# Obsidian Vault GPT

Este proyecto integra tu bóveda de Obsidian con modelos de lenguaje grandes (LLMs) como GPT de OpenAI, permitiéndote:

*   **Sincronizar notas** desde una carpeta de Google Drive.
*   **Chatear con una IA** que tiene acceso al contenido de tus notas.
*   Realizar **búsqueda semántica** en tus notas para encontrar información relevante.
*   Gestionar y visualizar tus notas a través de una interfaz web.

## Características Implementadas

*   **Autenticación OAuth2 con Google Drive**: Para acceder de forma segura a los archivos de tu bóveda.
*   **Sincronización de Notas**: Descarga archivos Markdown (`.md`) desde la carpeta especificada en Google Drive.
    *   Las notas, sus tags y metadatos se almacenan en una base de datos SQLite local en el backend.
    *   La sincronización es una tarea en segundo plano para no bloquear la UI.
*   **Generación de Embeddings**: Para cada nota sincronizada, se generan embeddings usando OpenAI (`text-embedding-3-small`).
    *   Los embeddings se almacenan en la base de datos.
*   **Índice FAISS para Búsqueda Semántica**:
    *   Se construye un índice FAISS a partir de los embeddings de las notas.
    *   El índice se guarda en disco (`faiss_index.idx`, `faiss_map.json`) y se carga/reconstruye al iniciar el backend o después de una sincronización.
*   **Endpoints API del Backend (FastAPI)**:
    *   Autenticación Google (`/api/auth/...`).
    *   Sincronización de Drive (`POST /api/drive/sync`, `GET /api/drive/sync_status`).
    *   Acceso a notas (`GET /api/notes`).
    *   Búsqueda de texto simple (`POST /api/simple_search`).
    *   Búsqueda semántica (`POST /api/knowledge-search`, protegida por Bearer Token).
    *   Chat con IA (`POST /api/chat`).
*   **Interfaz de Usuario Frontend (React + Vite)**:
    *   Pestañas para Sincronización, Librería de Notas, Búsqueda, Chat, Analíticas (placeholder), Documentación Custom GPT y Configuración.
    *   Vista detallada de notas con renderizado Markdown.
    *   Panel de configuración para ajustes de sincronización.

## Configuración

1.  **Clona el repositorio.**
2.  **Configura el Backend**:
    *   Navega al directorio `backend/`.
    *   Crea un archivo `.env` basado en `backend/.env.example` (que está en la raíz del proyecto, pero estas variables son para el backend).
    *   Rellena las siguientes variables en tu archivo `.env` (o directamente en tu entorno):
        
    *   Instala las dependencias: `pip install -r requirements.txt`
    *   Inicializa la base de datos y aplica las migraciones:

3.  **Configura el Frontend**:
    *   Navega al directorio raíz del proyecto.
    *   Crea un archivo `.env` basado en `.env.example`.
    *   Rellena las siguientes variables:
        
    *   Instala las dependencias: `npm install` (o `yarn install`).

## Ejecución

1.  **Ejecuta el Backend**:
    *   Desde el directorio `backend/`: `python main.py` (o `uvicorn main:app --reload --port <BACKEND_PORT>`)
2.  **Ejecuta el Frontend**:
    *   Desde el directorio raíz del proyecto: `npm run dev` (o `yarn dev`)
    *   Abre tu navegador en la dirección que indique Vite (generalmente `http://localhost:5173`).

## Uso

1.  **Autenticación**: Ve a la pestaña "Sync" y conéctate con Google Drive.
2.  **Sincronización**: Inicia una sincronización para descargar tus notas. El backend procesará los archivos, generará embeddings y construirá el índice de búsqueda. Puedes ver el estado en la UI.
3.  **Explora**: Usa las pestañas de Librería, Búsqueda o Chat para interactuar con tus notas.

## Archivos de Datos Generados por el Backend

Los siguientes archivos se generan y gestionan en el directorio `backend/` y están incluidos en `backend/.gitignore`:

*   `token.json`: Credenciales OAuth de Google.
*   `notes.db`: Base de datos SQLite con tus notas, tags y embeddings.
*   `faiss_index.idx`: Índice FAISS para búsqueda semántica.
*   `faiss_map.json`: Mapeo de IDs internos de FAISS a IDs de notas.


