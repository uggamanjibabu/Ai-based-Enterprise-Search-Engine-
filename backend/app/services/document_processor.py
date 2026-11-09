import os
import re
import hashlib
from typing import List, Dict, Any, Tuple
import pypdf
import docx
import pandas as pd

class DocumentProcessingError(Exception):
    pass

class DocumentProcessor:
    ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "csv"}
    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

    @staticmethod
    def calculate_sha256(file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def validate_file(filename: str, file_size: int) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in DocumentProcessor.ALLOWED_EXTENSIONS:
            raise DocumentProcessingError(
                f"Unsupported file type '{ext}'. Supported formats: {', '.join(DocumentProcessor.ALLOWED_EXTENSIONS).upper()}"
            )
        if file_size > DocumentProcessor.MAX_FILE_SIZE_BYTES:
            raise DocumentProcessingError(
                f"File size exceeds 50MB limit ({file_size / (1024 * 1024):.1f} MB)"
            )
        return ext

    @classmethod
    def extract_text(cls, file_path: str, file_type: str) -> str:
        if not os.path.exists(file_path):
            raise DocumentProcessingError(f"File not found: {file_path}")

        try:
            if file_type == "pdf":
                return cls._extract_pdf(file_path)
            elif file_type == "docx":
                return cls._extract_docx(file_path)
            elif file_type == "txt":
                return cls._extract_txt(file_path)
            elif file_type == "csv":
                return cls._extract_csv(file_path)
            else:
                raise DocumentProcessingError(f"Unsupported extraction format: {file_type}")
        except Exception as e:
            if isinstance(e, DocumentProcessingError):
                raise
            raise DocumentProcessingError(f"Failed to extract text from {file_type.upper()}: {str(e)}")

    @staticmethod
    def _extract_pdf(file_path: str) -> str:
        reader = pypdf.PdfReader(file_path)
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(text.strip())
        return "\n\n".join(pages_text)

    @staticmethod
    def _extract_docx(file_path: str) -> str:
        doc = docx.Document(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        # Also extract table cells
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                if row_text:
                    paragraphs.append(row_text)
        return "\n\n".join(paragraphs)

    @staticmethod
    def _extract_txt(file_path: str) -> str:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                return f.read()

    @staticmethod
    def _extract_csv(file_path: str) -> str:
        try:
            df = pd.read_csv(file_path)
            # Produce structured text representation
            lines = [f"Columns: {', '.join(df.columns.astype(str))}"]
            for idx, row in df.iterrows():
                row_str = ", ".join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)])
                lines.append(f"Row {idx + 1}: {row_str}")
            return "\n".join(lines)
        except Exception as e:
            raise DocumentProcessingError(f"CSV parse error: {str(e)}")

    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return ""
        # Remove zero-width and unusual control chars
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]", " ", text)
        # Normalize multiple spaces and tabs
        text = re.sub(r"[ \t]+", " ", text)
        # Normalize multiple newlines
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict[str, Any]]:
        """
        Splits text into chunks of roughly `chunk_size` characters,
        preferring paragraph and sentence boundaries, with `overlap`.
        """
        cleaned = DocumentProcessor.clean_text(text)
        if not cleaned:
            return []

        # Split into paragraphs first
        paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
        
        chunks = []
        current_chunk = ""
        chunk_idx = 0

        for para in paragraphs:
            # If paragraph itself is too large, split by sentences
            if len(para) > chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) + 1 <= chunk_size:
                        current_chunk = f"{current_chunk} {sentence}".strip()
                    else:
                        if current_chunk:
                            chunks.append({
                                "chunk_index": chunk_idx,
                                "content": current_chunk,
                                "token_count": len(current_chunk.split()),
                            })
                            chunk_idx += 1
                            # Retain overlap from end of previous chunk
                            overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                            current_chunk = f"{overlap_text} {sentence}".strip()
                        else:
                            current_chunk = sentence
            else:
                if len(current_chunk) + len(para) + 2 <= chunk_size:
                    current_chunk = f"{current_chunk}\n\n{para}".strip()
                else:
                    if current_chunk:
                        chunks.append({
                            "chunk_index": chunk_idx,
                            "content": current_chunk,
                            "token_count": len(current_chunk.split()),
                        })
                        chunk_idx += 1
                        overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                        current_chunk = f"{overlap_text}\n\n{para}".strip()
                    else:
                        current_chunk = para

        if current_chunk.strip():
            chunks.append({
                "chunk_index": chunk_idx,
                "content": current_chunk.strip(),
                "token_count": len(current_chunk.strip().split()),
            })

        return chunks

    @staticmethod
    def generate_summary(text: str, max_length: int = 300) -> str:
        """
        Generates a concise lead summary from the beginning of the text.
        """
        cleaned = DocumentProcessor.clean_text(text)
        if not cleaned:
            return "No content available."
        
        first_para = cleaned.split("\n\n")[0].strip()
        if len(first_para) <= max_length:
            return first_para
        return first_para[:max_length].rsplit(" ", 1)[0] + "..."

