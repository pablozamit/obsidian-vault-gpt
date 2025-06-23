from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Table
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import datetime

Base = declarative_base()

# Tabla asociativa para la relación muchos a muchos entre Note y Tag
note_tags_table = Table('note_tags', Base.metadata,
    Column('note_id', String, ForeignKey('notes.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, index=True) # Google Drive File ID
    title = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    modified_at = Column(DateTime, server_default=func.now(), onupdate=func.now()) # Drive's modifiedTime
    drive_modified_time = Column(DateTime, nullable=True) # Explicitly store Google Drive's modifiedTime
    source_url = Column(String, nullable=True) # webViewLink from Drive

    # Relación muchos a muchos con Tag
    tags = relationship("Tag", secondary=note_tags_table, back_populates="notes")

    def __repr__(self):
        return f"<Note(id='{self.id}', title='{self.title}')>"

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, index=True)

    # Relación muchos a muchos con Note
    notes = relationship("Note", secondary=note_tags_table, back_populates="tags")

    def __repr__(self):
        return f"<Tag(name='{self.name}')>"

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Foreign key a notes.id. unique=True asegura una relación uno a uno (o uno a cero) desde Note.
    # Si una nota se elimina, su embedding asociado también (ondelete='CASCADE').
    note_id = Column(String, ForeignKey("notes.id", ondelete='CASCADE'), unique=True, nullable=False, index=True)
    vector = Column(Text, nullable=False) # Almacenará el vector como un string JSON. Para SQLite, Text es adecuado.
                                        # Para otras BDs, JSON o tipos específicos de array/vector serían mejores.
    model_name = Column(String, nullable=False) # Ej. "text-embedding-3-small"
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relación uno-a-uno con Note (desde el lado de Embedding)
    note = relationship("Note", back_populates="embedding")

# Añadir la relación inversa a Note para un fácil acceso (uno-a-uno)
# uselist=False es clave para la relación uno-a-uno desde el lado "uno".
# cascade="all, delete-orphan" asegura que si se elimina una Note, su Embedding también.
Note.embedding = relationship("Embedding", uselist=False, back_populates="note", cascade="all, delete-orphan")
