import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.models.entities import DocumentChunk, Document
from app.ai.vector_store import VectorStore
from app.ai.keyword_search import KeywordSearchEngine

# Import all API routers
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.search import router as search_router
from app.api.ai import router as ai_router
from app.api.analytics import router as analytics_router
from app.api.users import router as users_router
from app.api.notifications import router as notifications_router
from app.api.settings import router as settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nexus_ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    logger.info("Initializing SQLite database tables...")
    Base.metadata.create_all(bind=engine)

    # Initialize AI models & search engines
    logger.info("Initializing Vector Store and Keyword Search...")
    db = SessionLocal()
    try:
        # Pre-warm vector store
        vs = VectorStore()
        logger.info(f"Vector Store ready with {vs.index.ntotal if vs.index else 0} vectors.")

        # Pre-warm keyword engine
        chunks = db.query(DocumentChunk).join(Document).filter(Document.status == "indexed").all()
        chunk_list = [
            {
                "document_id": c.document_id,
                "chunk_id": c.id,
                "chunk_index": c.chunk_index,
                "content": c.content
            } for c in chunks
        ]
        KeywordSearchEngine().rebuild_index(chunk_list)
        logger.info(f"Keyword Search Engine indexed {len(chunk_list)} active chunks.")
    except Exception as e:
        logger.error(f"Error during startup indexing: {e}")
    finally:
        db.close()

    yield
    logger.info("Shutting down NEXUS AI...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Turn Scattered Information into Instant Knowledge. High-performance Hybrid AI Enterprise Search & RAG.",
    version=settings.VERSION,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NEXUS AI Enterprise Search",
        "version": settings.VERSION
    }

# Mount static frontend production build if available
import os
from fastapi.staticfiles import StaticFiles

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

