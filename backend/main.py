from fastapi import FastAPI, HTTPException, Depends, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, HTMLResponse
import uvicorn
import os
from dotenv import load_dotenv
import json
import io
from datetime import datetime, timezone
from typing import List as TypingList, Optional, Dict, Any

# SQLAlchemy y Modelos de BD
from sqlalchemy import create_engine, or_ as sql_or_
from sqlalchemy.orm import sessionmaker, Session
from backend.database_models import Base, Note, Tag, Embedding

# Google OAuth y Drive API
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

# OpenAI
import openai

# FAISS y Numpy
import faiss
import numpy as np

# Pydantic
from pydantic import BaseModel as PydanticBaseModel, ConfigDict, Field

# Carga variables de entorno
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
if not os.getenv("OPENAI_API_KEY"):
    load_dotenv()

# --- Configuración de la Aplicación FastAPI ---
app = FastAPI(title="Obsidian Vault GPT Backend", version="0.1.0")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [frontend_url]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- Fin Configuración FastAPI ---

# --- Configuración OAuth (sin cambios) ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3001/api/auth/google/callback")
SCOPES = ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
CREDENTIALS_FILE = "token.json"

def get_google_flow():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET: raise ValueError("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar configurados")
    client_config = {"web": {"client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token", "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs", "redirect_uris": [REDIRECT_URI]}}
    return Flow.from_client_config(client_config=client_config, scopes=SCOPES, redirect_uri=REDIRECT_URI)

def save_credentials(credentials: Credentials):
    with open(CREDENTIALS_FILE, "w") as token_file: token_file.write(credentials.to_json())
    print(f"Credenciales guardadas en {CREDENTIALS_FILE}")

def load_credentials() -> Credentials | None:
    if os.path.exists(CREDENTIALS_FILE):
        try:
            creds = Credentials.from_authorized_user_file(CREDENTIALS_FILE, SCOPES)
            if creds and creds.expired and creds.refresh_token: creds.refresh(GoogleAuthRequest()); save_credentials(creds)
            return creds
        except Exception as e:
            print(f"Error cargando credenciales: {e}")
            if os.path.exists(CREDENTIALS_FILE):
                try: os.remove(CREDENTIALS_FILE); print(f"Archivo '{CREDENTIALS_FILE}' corrupto eliminado.")
                except OSError as oe: print(f"Error eliminando archivo '{CREDENTIALS_FILE}': {oe}")
    return None
# --- Fin Configuración OAuth ---

# --- Configuración Base de Datos ---
DATABASE_URL = "sqlite:///./notes.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()
# --- Fin Configuración Base de Datos ---

# --- Configuración FAISS ---
FAISS_INDEX_PATH = "faiss_index.idx" # Guardado en el directorio backend/
FAISS_MAP_PATH = "faiss_map.json"   # Guardado en el directorio backend/
faiss_index: Optional[faiss.Index] = None
faiss_id_to_note_id_map: list[str] = []
EMBEDDING_DIMENSION = 1536

def build_or_load_faiss_index(db: Session): # Renombrado y modificado
    global faiss_index, faiss_id_to_note_id_map

    # Intentar cargar desde disco primero
    if os.path.exists(FAISS_INDEX_PATH) and os.path.exists(FAISS_MAP_PATH):
        try:
            print(f"Cargando índice FAISS desde {FAISS_INDEX_PATH}...")
            loaded_index = faiss.read_index(FAISS_INDEX_PATH)
            with open(FAISS_MAP_PATH, 'r') as f:
                loaded_map = json.load(f)

            if loaded_index.ntotal > 0 and len(loaded_map) == loaded_index.ntotal:
                faiss_index = loaded_index
                faiss_id_to_note_id_map = loaded_map
                print(f"Índice FAISS cargado exitosamente desde disco con {faiss_index.ntotal} vectores.")
                return # Salir si la carga fue exitosa
            else:
                print("Índice FAISS o mapa cargado desde disco está vacío o inconsistente. Reconstruyendo...")
        except Exception as e:
            print(f"Error al cargar índice FAISS desde disco: {e}. Reconstruyendo...")

    # Si no se pudo cargar, construir desde BD
    print("Construyendo índice FAISS desde la base de datos...")
    db_embeddings = db.query(Embedding.note_id, Embedding.vector).all()

    if not db_embeddings:
        print("No hay embeddings en la BD para construir el índice FAISS.")
        faiss_index = None; faiss_id_to_note_id_map = []
        # Intentar eliminar archivos de índice viejos si no hay datos para evitar cargar un índice obsoleto la próxima vez
        if os.path.exists(FAISS_INDEX_PATH): os.remove(FAISS_INDEX_PATH)
        if os.path.exists(FAISS_MAP_PATH): os.remove(FAISS_MAP_PATH)
        return

    note_ids_temp = []
    vectors_list_temp = []
    for note_id, vector_json in db_embeddings:
        try:
            vector = json.loads(vector_json)
            if len(vector) == EMBEDDING_DIMENSION:
                note_ids_temp.append(note_id)
                vectors_list_temp.append(vector)
            else: print(f"Dimensión incorrecta para note_id {note_id}. Omitiendo.")
        except json.JSONDecodeError: print(f"Error JSON decodificando vector para note_id {note_id}. Omitiendo.")

    if not vectors_list_temp:
        print("No hay vectores válidos para construir el índice FAISS.")
        faiss_index = None; faiss_id_to_note_id_map = []
        if os.path.exists(FAISS_INDEX_PATH): os.remove(FAISS_INDEX_PATH)
        if os.path.exists(FAISS_MAP_PATH): os.remove(FAISS_MAP_PATH)
        return

    vectors_np = np.array(vectors_list_temp).astype('float32')
    if vectors_np.shape[1] != EMBEDDING_DIMENSION: # Doble chequeo
        print(f"Error crítico: Dimensiones inconsistentes en vectores NumPy.")
        faiss_index = None; faiss_id_to_note_id_map = []
        return

    current_faiss_index = faiss.IndexFlatL2(EMBEDDING_DIMENSION)
    faiss.normalize_L2(vectors_np)
    current_faiss_index.add(vectors_np)

    faiss_index = current_faiss_index
    faiss_id_to_note_id_map = note_ids_temp
    print(f"Índice FAISS construido con {faiss_index.ntotal} vectores.")

    # Guardar en disco
    try:
        print(f"Guardando índice FAISS en {FAISS_INDEX_PATH}...")
        faiss.write_index(faiss_index, FAISS_INDEX_PATH)
        with open(FAISS_MAP_PATH, 'w') as f:
            json.dump(faiss_id_to_note_id_map, f)
        print("Índice FAISS y mapa guardados exitosamente en disco.")
    except Exception as e:
        print(f"Error al guardar índice FAISS en disco: {e}")

@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try: build_or_load_faiss_index(db)
    finally: db.close()
# --- Fin Configuración FAISS ---

# --- Estado de Sincronización (para tarea en segundo plano) ---
sync_task_status: Dict[str, Any] = {"status": "idle", "message": "No iniciada", "last_error": None, "last_success_time": None, "processed_files": 0, "total_files": 0}
# --- Fin Estado de Sincronización ---

# --- Variables Globales y Helpers (sin cambios significativos, solo asegurar OpenAI key) ---
OBSIDIAN_VAULT_FOLDER_ID = os.getenv("OBSIDIAN_VAULT_FOLDER_ID")
API_BEARER_TOKEN = os.getenv("API_BEARER_TOKEN")
EMBEDDING_MODEL = "text-embedding-3-small"

def get_drive_service(credentials: Credentials): # ... (como estaba)
    if not credentials or not credentials.valid: raise ValueError("Credenciales de Google no válidas")
    return build("drive", "v3", credentials=credentials)

def extract_tags_from_content(content: str) -> list[str]: # ... (como estaba)
    import re
    content_no_code = re.sub(r"```.*?```", "", content, flags=re.DOTALL); content_no_code = re.sub(r"`.*?`", "", content_no_code)
    return list(set(re.findall(r"#([a-zA-Z0-9_.-]+)", content_no_code)))

def get_embedding(text: str, model: str = EMBEDDING_MODEL) -> list[float] | None: # ... (como estaba, asegurar API key)
    if not text or not text.strip(): return None
    try:
        text_to_embed = text.replace("\n", " "); max_chars = 20000
        if len(text_to_embed) > max_chars: text_to_embed = text_to_embed[:max_chars]
        client = openai.OpenAI(); current_api_key = os.getenv("OPENAI_API_KEY")
        if not current_api_key: print("Error: OPENAI_API_KEY no configurada."); return None
        client.api_key = current_api_key
        response = client.embeddings.create(input=[text_to_embed], model=model)
        return response.data[0].embedding
    except Exception as e: print(f"Error al generar embedding: {e}"); return None
# --- Fin Variables Globales y Helpers ---

# --- Endpoints Generales y OAuth (sin cambios) ---
@app.get("/", tags=["General"])
async def root(): return {"message": "Bienvenido al backend"}
@app.get("/api/health", tags=["General"])
async def health_check(): return {"status": "ok"}
# ... (Endpoints OAuth como estaban) ...
@app.get("/api/auth/google", tags=["Autenticación Google"])
async def auth_google_start(request: Request): # ...
    credentials = load_credentials()
    if credentials and not credentials.expired: return RedirectResponse(f"{frontend_url}?auth_status=already_authenticated")
    flow = get_google_flow(); authorization_url, state = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    return RedirectResponse(authorization_url)
@app.get("/api/auth/google/callback", tags=["Autenticación Google"])
async def auth_google_callback(request: Request, code: str = None, error: str = None, state: str = None): # ...
    if error: return HTMLResponse(f"<h1>Error: {error}</h1>", status_code=400)
    if not code: return HTMLResponse("<h1>Error: No code.</h1>", status_code=400)
    try: flow = get_google_flow(); flow.fetch_token(code=code); save_credentials(flow.credentials); return RedirectResponse(f"{frontend_url}?auth_status=success")
    except Exception as e: return HTMLResponse(f"<h1>Error: {e}</h1>", status_code=500)
@app.get("/api/auth/google/logout", tags=["Autenticación Google"])
async def auth_google_logout(): # ...
    if os.path.exists(CREDENTIALS_FILE):
        try: os.remove(CREDENTIALS_FILE)
        except OSError: pass
    return RedirectResponse(f"{frontend_url}?auth_status=logged_out")
@app.get("/api/auth/status", tags=["Autenticación Google"])
async def auth_status(): # ...
    credentials = load_credentials()
    if credentials and not credentials.expired:
        try: service = build('oauth2', 'v2', credentials=credentials); user_info = service.userinfo().get().execute(); return {"authenticated": True, "email": user_info.get("email"), "name": user_info.get("name"), "picture": user_info.get("picture")}
        except Exception as e: return {"authenticated": True, "error_user_info": str(e)}
    return {"authenticated": False}

# --- Función de Sincronización en Segundo Plano ---
def perform_drive_sync_and_reindex(db: Session):
    global sync_task_status
    sync_task_status = {"status": "syncing", "message": "Iniciando sincronización...", "last_error": None, "processed_files": 0, "total_files": 0}

    try:
        if not OBSIDIAN_VAULT_FOLDER_ID:
            raise ValueError("OBSIDIAN_VAULT_FOLDER_ID no está configurado en el entorno.")
        credentials = load_credentials()
        if not credentials: raise ValueError("No autenticado para la tarea de sincronización.")
        if not credentials.valid: raise ValueError("Credenciales inválidas para la tarea de sincronización.")

        service = get_drive_service(credentials)
        query = f"'{OBSIDIAN_VAULT_FOLDER_ID}' in parents and (mimeType='text/markdown' or name contains '.md' or mimeType='application/octet-stream') and trashed=false"
        all_files_meta = []
        page_token = None
        sync_task_status["message"] = "Listando archivos de Google Drive..."
        while True:
            results = service.files().list(q=query, pageSize=100, fields="nextPageToken, files(id, name, modifiedTime, webViewLink, mimeType)", pageToken=page_token).execute()
            all_files_meta.extend(results.get("files", []))
            page_token = results.get("nextPageToken")
            if not page_token: break

        sync_task_status["total_files"] = len(all_files_meta)
        if not all_files_meta:
            sync_task_status = {"status": "success", "message": "No se encontraron archivos .md para sincronizar.", "last_success_time": datetime.now(timezone.utc).isoformat(), "processed_files": 0, "total_files": 0}
            return

        changed_notes_exist_in_sync = False
        for i, item_meta in enumerate(all_files_meta):
            sync_task_status["message"] = f"Procesando archivo {i+1} de {len(all_files_meta)}: {item_meta.get('name')}"
            sync_task_status["processed_files"] = i + 1

            file_id = item_meta.get("id"); file_name = item_meta.get("name"); mime_type = item_meta.get("mimeType")
            modified_time_str = item_meta.get("modifiedTime"); source_url = item_meta.get("webViewLink")

            if mime_type == 'application/octet-stream' and not (file_name and file_name.lower().endswith('.md')): continue

            request_content = service.files().get_media(fileId=file_id); fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request_content); done = False; content_str = ""
            should_generate_embedding_for_this_note = False

            try:
                while not done: status, done = downloader.next_chunk()
                fh.seek(0); content_str = fh.read().decode("utf-8")
                drive_mod_time_dt = datetime.fromisoformat(modified_time_str.replace("Z", "+00:00")) if modified_time_str else datetime.now(timezone.utc)
                db_note = db.query(Note).filter(Note.id == file_id).first()

                if db_note:
                    if db_note.drive_modified_time is None or drive_mod_time_dt > db_note.drive_modified_time:
                        db_note.title = (file_name.replace(".md", "") if file_name else f"Untitled_{file_id}")
                        db_note.content = content_str; db_note.drive_modified_time = drive_mod_time_dt
                        db_note.source_url = source_url; db_note.tags.clear(); should_generate_embedding_for_this_note = True; changed_notes_exist_in_sync = True
                        extracted_tags = extract_tags_from_content(content_str)
                        for tag_name in extracted_tags:
                            db_tag = db.query(Tag).filter(Tag.name == tag_name).first()
                            if not db_tag: db_tag = Tag(name=tag_name); db.add(db_tag)
                            if db_tag not in db_note.tags: db_note.tags.append(db_tag)
                else:
                    db_note = Note(id=file_id, title=(file_name.replace(".md", "") if file_name else f"Untitled_{file_id}"), content=content_str, drive_modified_time=drive_mod_time_dt, source_url=source_url)
                    extracted_tags = extract_tags_from_content(content_str)
                    for tag_name in extracted_tags:
                        db_tag = db.query(Tag).filter(Tag.name == tag_name).first()
                        if not db_tag: db_tag = Tag(name=tag_name); db.add(db_tag)
                        db_note.tags.append(db_tag)
                    db.add(db_note); should_generate_embedding_for_this_note = True; changed_notes_exist_in_sync = True

                if should_generate_embedding_for_this_note:
                    note_content_for_embedding = f"{db_note.title}\n\n{content_str}"
                    embedding_vector = get_embedding(note_content_for_embedding)
                    if embedding_vector:
                        existing_embedding = db.query(Embedding).filter(Embedding.note_id == db_note.id).first()
                        if existing_embedding:
                            existing_embedding.vector = json.dumps(embedding_vector); existing_embedding.model_name = EMBEDDING_MODEL
                            existing_embedding.updated_at = datetime.now(timezone.utc)
                        else: db.add(Embedding(note_id=db_note.id, vector=json.dumps(embedding_vector), model_name=EMBEDDING_MODEL))
                db.commit()
            except Exception as e_file_process:
                db.rollback()
                print(f"Error procesando archivo {file_name} en tarea de fondo: {e_file_process}")
                # Podríamos registrar este error específico de archivo, pero la tarea general continuará

        if changed_notes_exist_in_sync:
            sync_task_status["message"] = "Reconstruyendo índice de búsqueda..."
            build_or_load_faiss_index(db)

        sync_task_status = {"status": "success", "message": "Sincronización completada.", "last_success_time": datetime.now(timezone.utc).isoformat(), "processed_files": len(all_files_meta), "total_files": len(all_files_meta)}
        print("Tarea de sincronización en segundo plano completada exitosamente.")

    except Exception as e_sync_task:
        print(f"Error en la tarea de sincronización en segundo plano: {e_sync_task}")
        sync_task_status = {"status": "error", "message": f"Error en la sincronización: {e_sync_task}", "last_error": str(e_sync_task), "processed_files": sync_task_status.get("processed_files",0), "total_files": sync_task_status.get("total_files",0)}

# --- Google Drive Sync Endpoint (ahora asíncrono) ---
@app.post("/api/drive/sync", tags=["Google Drive"]) # Cambiado a POST para iniciar una acción
async def trigger_drive_sync(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    global sync_task_status
    if sync_task_status.get("status") == "syncing":
        raise HTTPException(status_code=409, detail="Una sincronización ya está en progreso.")

    # Pasar una nueva sesión de BD a la tarea en segundo plano
    # No se puede pasar directamente 'db' de Depends() porque la sesión se cierra.
    # La tarea en segundo plano necesitará su propia sesión.
    # Solución: perform_drive_sync_and_reindex ahora toma la sesión como argumento.
    # Necesitamos asegurar que la sesión de BD usada por la tarea en segundo plano se maneje correctamente.
    # FastAPI BackgroundTasks no maneja dependencias complejas como sesiones de BD directamente.
    # Una forma es crear una nueva sesión dentro de la tarea.

    def sync_with_new_db_session():
        new_db = SessionLocal()
        try:
            perform_drive_sync_and_reindex(new_db)
        finally:
            new_db.close()

    background_tasks.add_task(sync_with_new_db_session)
    return {"message": "Sincronización con Google Drive iniciada en segundo plano."}

@app.get("/api/drive/sync_status", tags=["Google Drive"])
async def get_sync_status():
    global sync_task_status
    return sync_task_status
# --- Fin Google Drive Sync Endpoint ---


# --- Endpoints /api/notes y /api/simple_search (sin cambios) ---
@app.get("/api/notes", response_model=TypingList[NoteResponse], tags=["Notas"])
async def get_notes_from_db(db: Session = Depends(get_db), skip: int = 0, limit: int = 100): # ...
    notes = db.query(Note).order_by(Note.drive_modified_time.desc().nullslast(), Note.title).offset(skip).limit(limit).all(); return notes
class SearchQuery(PydanticBaseModel): query: str; limit: Optional[int] = 10
@app.post("/api/simple_search", response_model=TypingList[NoteResponse], tags=["Búsqueda"])
async def simple_search_notes(search_query: SearchQuery, db: Session = Depends(get_db)): # ...
    query_str = f"%{search_query.query}%"; notes = db.query(Note).filter(sql_or_(Note.title.ilike(query_str), Note.content.ilike(query_str))).order_by(Note.drive_modified_time.desc().nullslast(), Note.title).limit(search_query.limit).all(); return notes
# --- Fin Endpoints /api/notes y /api/simple_search ---

# --- Endpoint de Búsqueda de Conocimiento (FAISS) (sin cambios) ---
class KnowledgeSearchQuery(PydanticBaseModel): query: str; k: Optional[int] = Field(default=5, gt=0, le=50)
async def verify_api_token(x_api_token: str = Header(None)): # ...
    if not API_BEARER_TOKEN: print("ADVERTENCIA: API_BEARER_TOKEN no configurado."); return
    if not x_api_token or x_api_token != API_BEARER_TOKEN: raise HTTPException(status_code=401, detail="Token API inválido o faltante.")
@app.post("/api/knowledge-search", response_model=TypingList[NoteResponse], tags=["Búsqueda Avanzada"], dependencies=[Depends(verify_api_token)])
async def knowledge_search(query: KnowledgeSearchQuery, db: Session = Depends(get_db)): # ...
    global faiss_index, faiss_id_to_note_id_map
    if faiss_index is None or faiss_index.ntotal == 0:
        print("Índice FAISS no disponible/vacío, intentando reconstruir..."); build_or_load_faiss_index(db)
        if faiss_index is None or faiss_index.ntotal == 0: raise HTTPException(status_code=503, detail="Índice de búsqueda no disponible.")
    query_embedding_vector = get_embedding(query.query)
    if not query_embedding_vector: raise HTTPException(status_code=400, detail="No se pudo generar embedding para la consulta.")
    query_np = np.array([query_embedding_vector]).astype('float32'); faiss.normalize_L2(query_np)
    actual_k = min(query.k, faiss_index.ntotal);
    if actual_k == 0: return []
    distances, indices = faiss_index.search(query_np, actual_k)
    found_note_ids = [faiss_id_to_note_id_map[i] for i in indices[0]]
    if not found_note_ids: return []
    db_notes = db.query(Note).filter(Note.id.in_(found_note_ids)).all()
    ordered_notes = sorted(db_notes, key=lambda note: found_note_ids.index(note.id)); return ordered_notes
# --- Fin Endpoint Búsqueda de Conocimiento ---

# --- Chat AI Endpoint (sin cambios significativos) ---
class ChatRequest(PydanticBaseModel): message: str; relevant_notes_content: Optional[TypingList[str]] = None
class ChatMsgResponse(PydanticBaseModel): reply: str
if not os.getenv("OPENAI_API_KEY"): print("ADVERTENCIA: OPENAI_API_KEY no encontrada.")
@app.post("/api/chat", response_model=ChatMsgResponse, tags=["Chat AI"])
async def chat_with_ai(request: ChatRequest): # ...
    current_api_key = os.getenv("OPENAI_API_KEY")
    if not current_api_key: raise HTTPException(status_code=503, detail="OPENAI_API_KEY no configurada.")
    client = openai.OpenAI(api_key=current_api_key)
    user_message = request.message; context_str = ""
    if request.relevant_notes_content: context_str = "\n\nContexto:\n" + "\n---\n".join(request.relevant_notes_content)
    prompt_messages = [{"role": "system", "content": "Eres un asistente útil."}, {"role": "user", "content": user_message + context_str}]
    try: completion = client.chat.completions.create(model="gpt-3.5-turbo", messages=prompt_messages); return ChatMsgResponse(reply=completion.choices[0].message.content.strip())
    except Exception as e: print(f"Error OpenAI: {e}"); raise HTTPException(status_code=500, detail=f"Error IA: {str(e)}")
# --- Fin Chat AI Endpoint ---

if __name__ == "__main__":
    backend_port = int(os.getenv("BACKEND_PORT", "3001"))
    uvicorn.run("main:app", host="0.0.0.0", port=backend_port, reload=True)
