import pymupdf as fitz
from typing import List, Dict, Any, Tuple


class PDFExtractionError(Exception):
    pass


class ScannedPDFError(PDFExtractionError):
    pass


def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[List[Dict[str, Any]], int, int]:
    """
    Extracts text page-by-page from a PDF byte stream.

    Returns:
        pages: List of {"page_number": int, "text": str}
        total_pages: int
        total_chars: int

    Raises:
        PDFExtractionError: If file is corrupted or unreadable.
        ScannedPDFError: If PDF has fewer than 50 total characters across all pages.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise PDFExtractionError(f"Could not open PDF file. It may be corrupted or encrypted: {e}")

    total_pages = len(doc)
    if total_pages == 0:
        raise PDFExtractionError("PDF contains 0 pages.")

    pages: List[Dict[str, Any]] = []
    total_chars = 0

    for page_idx in range(total_pages):
        page = doc.load_page(page_idx)
        text = page.get_text("text").strip()
        pages.append({
            "page_number": page_idx + 1,
            "text": text,
        })
        total_chars += len(text)

    doc.close()

    # Graceful handling for scanned / image-only PDFs
    if total_chars < 50:
        raise ScannedPDFError(
            "The uploaded PDF appears to be a scanned image or photo with no selectable text. "
            "Please upload a text-searchable PDF document."
        )

    return pages, total_pages, total_chars
