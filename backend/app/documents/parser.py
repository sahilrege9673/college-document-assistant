import logging
import pymupdf as fitz
from typing import List, Dict, Any, Tuple
from app.gemini.client import gemini_client

logger = logging.getLogger("app.documents.parser")


class PDFExtractionError(Exception):
    pass


class ScannedPDFError(PDFExtractionError):
    pass


def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[List[Dict[str, Any]], int, int]:
    """
    Extracts text page-by-page from a PDF byte stream.
    Supports standard text PDFs as well as image-heavy, scanned, and diagram pages
    via PyMuPDF and Gemini Multimodal Vision OCR.

    Returns:
        pages: List of {"page_number": int, "text": str}
        total_pages: int
        total_chars: int

    Raises:
        PDFExtractionError: If file is corrupted or unreadable.
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
        raw_text = page.get_text("text").strip()
        page_text = raw_text

        # If page has very little selectable text (scanned page, slides, or diagrams)
        # Attempt Gemini Vision OCR if configured
        if len(raw_text) < 50:
            try:
                # Render page at 150 DPI for OCR/multimodal interpretation
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")

                if gemini_client.is_configured():
                    logger.info(f"Page {page_idx + 1} has sparse text ({len(raw_text)} chars). Triggering Gemini Vision OCR...")
                    vision_text = gemini_client.extract_text_and_diagrams_from_image(img_bytes)
                    if vision_text:
                        if page_text:
                            page_text = f"{page_text}\n\n[Diagram & Scanned Content]:\n{vision_text}"
                        else:
                            page_text = vision_text
                        logger.info(f"Gemini Vision successfully extracted {len(vision_text)} characters for Page {page_idx + 1}.")
            except Exception as ocr_err:
                logger.warning(f"Vision OCR skipped for page {page_idx + 1}: {ocr_err}")

        # If still empty (e.g. blank page or decorative image), provide placeholder to keep page numbering
        if not page_text:
            page_text = f"[Page {page_idx + 1}: Visual diagram or empty content]"

        pages.append({
            "page_number": page_idx + 1,
            "text": page_text,
        })
        total_chars += len(page_text)

    doc.close()
    return pages, total_pages, total_chars
