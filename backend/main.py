from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Carga variables desde un .env en el directorio backend o el directorio raíz del proyecto
# Si hay un backend/.env, tomará precedencia para las variables definidas ahí.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
if not os.getenv("OPENAI_API_KEY"): # Intenta cargar desde la raíz si no se encontró en backend/.env
    load_dotenv()


app = FastAPI(title="Obsidian Vault GPT Backend", version="0.1.0")

# Configuración de CORS
# Es importante que FRONTEND_URL esté definida en tu archivo .env
# Ejemplo: FRONTEND_URL=http://localhost:5173
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

origins = [
    frontend_url,
]

# Si estás usando Gitpod o Codespaces, es posible que necesites añadir más orígenes dinámicamente
# Ejemplo para Gitpod:
# gitpod_workspace_url = os.getenv("GITPOD_WORKSPACE_URL")
# if gitpod_workspace_url:
#     try:
#         # Construir la URL del frontend para Gitpod (asumiendo que el frontend corre en el puerto 5173)
#         from urllib.parse import urlparse
#         parsed_gitpod_url = urlparse(gitpod_workspace_url)
#         frontend_gitpod_url = f"https://5173-{parsed_gitpod_url.hostname}"
#         origins.append(frontend_gitpod_url)
#     except Exception as e:
#         print(f"Error al procesar GITPOD_WORKSPACE_URL para CORS: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Importaciones Adicionales para OAuth ---
from fastapi import Request
from fastapi.responses import RedirectResponse, HTMLResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest # Renombrar para evitar conflicto
import json
# --- Fin Importaciones Adicionales para OAuth ---


# --- Configuración OAuth 2.0 para Google Drive ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3001/api/auth/google/callback")
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]
CREDENTIALS_FILE = "token.json"

def get_google_flow():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise ValueError("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar configurados en .env")
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "redirect_uris": [REDIRECT_URI],
        }
    }
    return Flow.from_client_config(
        client_config=client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )

def save_credentials(credentials: Credentials):
    with open(CREDENTIALS_FILE, "w") as token_file:
        token_file.write(credentials.to_json())
    print(f"Credenciales guardadas en {CREDENTIALS_FILE}")

def load_credentials() -> Credentials | None:
    if os.path.exists(CREDENTIALS_FILE):
        try:
            creds = Credentials.from_authorized_user_file(CREDENTIALS_FILE, SCOPES)
            if creds and creds.expired and creds.refresh_token:
                print("Refrescando token de Google...")
                creds.refresh(GoogleAuthRequest())
                save_credentials(creds)
            return creds
        except Exception as e:
            print(f"Error cargando credenciales desde archivo '{CREDENTIALS_FILE}': {e}")
            try:
                os.remove(CREDENTIALS_FILE)
                print(f"Archivo '{CREDENTIALS_FILE}' corrupto eliminado.")
            except OSError as oe:
                print(f"Error eliminando archivo '{CREDENTIALS_FILE}': {oe}")
    return None
# --- Fin Configuración OAuth ---

# --- Importaciones Adicionales para Google Drive API ---
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
import io
# --- Fin Importaciones Adicionales ---

# --- Variable de entorno para Google Drive Folder ID ---
OBSIDIAN_VAULT_FOLDER_ID = os.getenv("OBSIDIAN_VAULT_FOLDER_ID")

# --- Helper para construir el servicio de Google Drive ---
def get_drive_service(credentials: Credentials):
    if not credentials or not credentials.valid:
        # Esto debería ser manejado antes de llamar a get_drive_service,
        # pero una doble comprobación no hace daño.
        print("Intento de usar get_drive_service con credenciales no válidas.")
        raise ValueError("Credenciales de Google no válidas o no encontradas para get_drive_service.")
    try:
        service = build("drive", "v3", credentials=credentials)
        return service
    except HttpError as error:
        print(f"Ocurrió un error al construir el servicio de Drive: {error}")
        # Podríamos querer propagar un error específico o un estado que indique al usuario que re-autentique
        raise HttpError(f"Error construyendo servicio Drive: {error.resp.status}", error.resp) from error
    except Exception as e:
        print(f"Excepción general al construir el servicio de Drive: {e}")
        raise Exception(f"Excepción general construyendo servicio Drive: {e}") from e


@app.get("/", tags=["General"])
async def root():
    """
    Endpoint raíz que da la bienvenida al backend.
    """
    return {"message": "Bienvenido al backend de Obsidian Vault GPT"}

@app.get("/api/health", tags=["General"])
async def health_check():
    """
    Endpoint de verificación de salud para el backend.
    """
    return {"status": "ok", "message": "Backend operativo"}

# --- Endpoints OAuth ---
@app.get("/api/auth/google", tags=["Autenticación Google"])
async def auth_google_start(request: Request):
    """
    Inicia el flujo de autenticación OAuth2 con Google.
    Redirige al usuario a la página de consentimiento de Google.
    """
    credentials = load_credentials()
    if credentials and not credentials.expired:
        frontend_redirect_url = f"{frontend_url}?auth_status=already_authenticated" # Notificar al frontend
        return RedirectResponse(frontend_redirect_url)
        # return HTMLResponse(content=f"<p>Ya estás autenticado con Google. Puedes cerrar esta ventana o <a href='{frontend_url}'>volver a la aplicación</a>.</p><p><a href='/api/auth/google/logout'>Cerrar sesión</a></p>", status_code=200)

    try:
        flow = get_google_flow()
    except ValueError as e:
        return HTMLResponse(content=f"<h1>Error de Configuración OAuth</h1><p>{e}</p><p>Asegúrate de que GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET estén en tu archivo .env.</p>", status_code=500)

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true"
    )
    # Guardar state en sesión del backend (FastAPI usa starlette.requests.Request.session)
    # Para esto, se necesita SecretKeyMiddleware. Ejemplo:
    # from starlette.middleware.sessions import SessionMiddleware
    # app.add_middleware(SessionMiddleware, secret_key="SUPER_SECRET_KEY_FOR_SESSIONS")
    # request.session['oauth_state'] = state
    # Por ahora, omitimos CSRF con 'state' para simplificar, pero es crucial para producción.
    print(f"URL de autorización: {authorization_url}")
    print(f"OAuth State generado (ignorado por ahora): {state}") # Para depuración
    return RedirectResponse(authorization_url)

@app.get("/api/auth/google/callback", tags=["Autenticación Google"])
async def auth_google_callback(request: Request, code: str = None, error: str = None, state: str = None):
    """
    Callback de Google después de la autenticación.
    Intercambia el código de autorización por tokens de acceso/actualización.
    """
    # Validación de state para CSRF (omitida por ahora)
    # expected_state = request.session.pop('oauth_state', None)
    # if not state or state != expected_state:
    #     return HTMLResponse(content="<h1>Error: State de OAuth inválido (posible CSRF).</h1>", status_code=400)

    if error:
        return HTMLResponse(content=f"<h1>Error en la autenticación de Google</h1><p>Error: {error}. Por favor, intenta <a href='/api/auth/google'>autenticar de nuevo</a>.</p>", status_code=400)
    if not code:
        return HTMLResponse(content="<h1>Error: No se recibió el código de autorización.</h1><p>Por favor, intenta <a href='/api/auth/google'>autenticar de nuevo</a>.</p>", status_code=400)

    try:
        flow = get_google_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials
        save_credentials(credentials)

        # Redirigir al frontend a una página de éxito o a la página principal
        frontend_redirect_url = f"{frontend_url}?auth_status=success"
        return RedirectResponse(frontend_redirect_url)
        # return HTMLResponse(content="<h1>Autenticación con Google exitosa!</h1><p>Puedes cerrar esta ventana. La aplicación ahora tiene acceso a tu Google Drive (solo lectura).</p>", status_code=200)

    except ValueError as ve: # Errores de configuración
        return HTMLResponse(content=f"<h1>Error de Configuración OAuth en Callback</h1><p>{ve}</p>", status_code=500)
    except Exception as e:
        print(f"Error al intercambiar el código por token: {e}")
        return HTMLResponse(content=f"<h1>Error al obtener tokens de Google</h1><p>Detalle: {e}. Por favor, intenta <a href='/api/auth/google'>autenticar de nuevo</a>.</p>", status_code=500)

@app.get("/api/auth/google/logout", tags=["Autenticación Google"])
async def auth_google_logout():
    """
    Cierra la sesión de Google Drive eliminando las credenciales almacenadas.
    """
    logout_success = False
    if os.path.exists(CREDENTIALS_FILE):
        try:
            os.remove(CREDENTIALS_FILE)
            logout_success = True
            print(f"Archivo '{CREDENTIALS_FILE}' eliminado.")
        except OSError as e:
            print(f"Error eliminando archivo '{CREDENTIALS_FILE}': {e}")

    # Redirigir al frontend a una página de logout o a la página principal
    frontend_redirect_url = f"{frontend_url}?auth_status=logged_out"
    if not logout_success and not os.path.exists(CREDENTIALS_FILE): # Ya estaba deslogueado
        frontend_redirect_url = f"{frontend_url}?auth_status=already_logged_out"

    return RedirectResponse(frontend_redirect_url)
    # return HTMLResponse(content="<h1>Sesión de Google Drive cerrada.</h1><p>Puedes <a href='/api/auth/google'>iniciar sesión</a> de nuevo.</p>")


@app.get("/api/auth/status", tags=["Autenticación Google"])
async def auth_status():
    """
    Verifica el estado de la autenticación y devuelve información del usuario si está autenticado.
    """
    credentials = load_credentials()
    if credentials and not credentials.expired:
        try:
            # Opcional: obtener información del usuario
            from googleapiclient.discovery import build
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            return {
                "authenticated": True,
                "email": user_info.get("email"),
                "name": user_info.get("name"),
                "picture": user_info.get("picture")
            }
        except Exception as e:
            print(f"Error obteniendo user_info: {e}")
            # Si falla obtener user_info pero las credenciales son válidas, al menos indicar autenticado
            return {"authenticated": True, "error_user_info": str(e)}
    return {"authenticated": False}
# --- Fin Endpoints OAuth ---

# --- Endpoint para listar y leer archivos de Drive ---
@app.get("/api/drive/files", tags=["Google Drive"])
async def list_drive_files():
    """
    Lista y descarga archivos .md de la carpeta de Obsidian Vault en Google Drive.
    Requiere autenticación previa.
    """
    if not OBSIDIAN_VAULT_FOLDER_ID:
        return {"error": "OBSIDIAN_VAULT_FOLDER_ID no está configurado en el entorno."}, 400

    credentials = load_credentials()
    if not credentials:
        return {"error": "No autenticado. Por favor, visita /api/auth/google para autenticarte."}, 401

    # El refresco ya se maneja en load_credentials(), pero verificamos validez aquí.
    if not credentials.valid:
        # Si load_credentials devolvió algo pero no es válido (ej. refresh_token expirado/revocado)
        print("Credenciales cargadas pero no son válidas (posiblemente refresh_token revocado).")
        if os.path.exists(CREDENTIALS_FILE):
            try:
                os.remove(CREDENTIALS_FILE)
                print(f"Archivo '{CREDENTIALS_FILE}' de token inválido eliminado.")
            except OSError as oe:
                print(f"Error eliminando archivo de token inválido '{CREDENTIALS_FILE}': {oe}")
        return {"error": "Credenciales inválidas. Por favor, re-autentícate visitando /api/auth/google"}, 401

    try:
        service = get_drive_service(credentials)

        query = f"'{OBSIDIAN_VAULT_FOLDER_ID}' in parents and (mimeType='text/markdown' or name contains '.md' or mimeType='application/octet-stream') and trashed=false"
        # mimeType='application/octet-stream' es un fallback por si Drive no reconoce .md como text/markdown

        all_files = []
        page_token = None
        while True:
            results = (
                service.files()
                .list(
                    q=query,
                    pageSize=100, # Máximo permitido por la API es 1000, pero 100 es un buen compromiso
                    fields="nextPageToken, files(id, name, modifiedTime, webViewLink, mimeType)",
                    pageToken=page_token
                )
                .execute()
            )
            items = results.get("files", [])
            all_files.extend(items)
            page_token = results.get("nextPageToken")
            if not page_token:
                break

        if not all_files:
            return {"message": "No se encontraron archivos .md en la carpeta especificada.", "count": 0, "notes": []}

        notes_data = []
        for item in all_files:
            file_id = item.get("id")
            file_name = item.get("name")
            mime_type = item.get("mimeType")

            # Filtrar de nuevo por nombre si mimeType es application/octet-stream
            if mime_type == 'application/octet-stream' and not file_name.lower().endswith('.md'):
                print(f"Omitiendo archivo '{file_name}' (ID: {file_id}) debido a extensión no .md y mimeType genérico.")
                continue

            modified_time = item.get("modifiedTime")
            source_url = item.get("webViewLink")
            print(f"Procesando archivo: {file_name} (ID: {file_id}, MimeType: {mime_type})")

            request_content = service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request_content)
            done = False
            content = ""
            try:
                while done is False:
                    status, done = downloader.next_chunk()
                fh.seek(0)
                content = fh.read().decode("utf-8")
                notes_data.append({
                    "id": file_id,
                    "title": file_name.replace(".md", "") if file_name else f"Untitled_{file_id}",
                    "content": content,
                    "modifiedTime": modified_time,
                    "sourceUrl": source_url
                })
            except HttpError as error:
                print(f"Ocurrió un error HttpError al descargar {file_name}: {error}")
                notes_data.append({ "id": file_id, "title": file_name.replace(".md", ""), "error_downloading": str(error), "modifiedTime": modified_time, "sourceUrl": source_url})
            except Exception as e: # Captura otras excepciones durante la descarga/decodificación
                print(f"Ocurrió una excepción general al descargar o decodificar {file_name}: {e}")
                notes_data.append({ "id": file_id, "title": file_name.replace(".md", ""), "error_processing": str(e), "modifiedTime": modified_time, "sourceUrl": source_url})

        return {"count": len(notes_data), "notes": notes_data}

    except HttpError as error:
        print(f"Ocurrió un error con la API de Drive (HttpError): {error.resp.status} - {error._get_reason()}")
        error_content = error.content.decode('utf-8') if error.content else "{}"
        try:
            error_json = json.loads(error_content)
        except json.JSONDecodeError:
            error_json = {"message": error_content}

        if error.resp.status in [401, 403]:
             if os.path.exists(CREDENTIALS_FILE):
                os.remove(CREDENTIALS_FILE)
             return {"error": "Error de autenticación/autorización con Google Drive.", "details": error_json, "suggestion": "Por favor, re-autentícate."}, error.resp.status
        return {"error": "Ocurrió un error con la API de Drive.", "details": error_json}, error.resp.status

    except ValueError as ve: # Por ejemplo, de get_drive_service si las credenciales son inválidas al inicio
        print(f"Error de valor (ej. credenciales inválidas): {ve}")
        return {"error": str(ve)}, 401 # O un código de error apropiado

    except Exception as e:
        print(f"Excepción general al acceder a Drive: {e}")
        return {"error": f"Excepción general: {str(e)}"}, 500

# --- Fin Endpoint Drive ---


if __name__ == "__main__":
    backend_port = int(os.getenv("BACKEND_PORT", "3001"))
    uvicorn.run("main:app", host="0.0.0.0", port=backend_port, reload=True)
