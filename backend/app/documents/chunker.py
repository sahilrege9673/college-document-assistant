from typing import List, Dict, Any


def chunk_document_pages(
    pages: List[Dict[str, Any]],
    chunk_size: int = 900,
    overlap: int = 120,
) -> List[Dict[str, Any]]:
    """
    Splits text across document pages into overlapping character windows (800-1000 chars, 100-150 overlap).
    Preserves page numbers and eliminates duplicate chunks.

    Returns:
        List of dicts:
        {
            "chunk_index": int,
            "content": str,
            "page_number": int,
            "token_count": int,
        }
    """
    chunks: List[Dict[str, Any]] = []
    seen_contents = set()
    global_chunk_index = 0

    for page in pages:
        page_num = page["page_number"]
        page_text = page["text"].strip()

        if not page_text or len(page_text) < 15:
            continue

        text_len = len(page_text)

        # If page text is smaller than or equal to chunk_size, take the whole page as one chunk
        if text_len <= chunk_size:
            normalized = " ".join(page_text.split())
            if normalized not in seen_contents and len(normalized) >= 20:
                seen_contents.add(normalized)
                chunks.append({
                    "chunk_index": global_chunk_index,
                    "content": page_text,
                    "page_number": page_num,
                    "token_count": max(1, len(page_text) // 4),
                })
                global_chunk_index += 1
            continue

        # Sliding window for longer pages
        start = 0
        step = max(100, chunk_size - overlap)

        while start < text_len:
            end = min(start + chunk_size, text_len)

            # Try to break on whitespace near the end of the window
            if end < text_len:
                last_space = page_text.rfind(" ", start, end)
                if last_space != -1 and last_space > start + int(chunk_size * 0.75):
                    end = last_space

            chunk_text = page_text[start:end].strip()

            if len(chunk_text) >= 20:
                normalized = " ".join(chunk_text.split())
                if normalized not in seen_contents:
                    seen_contents.add(normalized)
                    chunks.append({
                        "chunk_index": global_chunk_index,
                        "content": chunk_text,
                        "page_number": page_num,
                        "token_count": max(1, len(chunk_text) // 4),
                    })
                    global_chunk_index += 1

            if end >= text_len:
                break

            start += step

    return chunks
