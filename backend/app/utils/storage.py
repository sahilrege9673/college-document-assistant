import os
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("app.storage")


class StorageService:
    """
    Unified Storage Service.
    Uploads PDFs to Supabase Storage bucket ('college-docs').
    Gracefully falls back to local disk storage in `./uploads` if Supabase credentials
    are not yet configured or reachable during local development.
    """

    def __init__(self):
        self.client = None
        self.bucket = settings.SUPABASE_BUCKET_NAME
        self.local_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
        os.makedirs(self.local_dir, exist_ok=True)

        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                from supabase import create_client
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
                logger.info("Supabase Storage client initialized.")
            except Exception as e:
                logger.warning(f"Could not initialize Supabase Storage client: {e}. Using local storage fallback.")

    def upload_file(self, file_bytes: bytes, destination_path: str, content_type: str = "application/pdf") -> str:
        """
        Uploads file bytes to Supabase Storage or local fallback directory.
        Returns the resolved storage path.
        """
        if self.client:
            try:
                # Try uploading to Supabase Storage bucket
                self.client.storage.from_(self.bucket).upload(
                    path=destination_path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
                logger.info(f"Uploaded {destination_path} to Supabase bucket '{self.bucket}'")
                return f"supabase://{self.bucket}/{destination_path}"
            except Exception as e:
                logger.warning(f"Supabase upload failed ({e}). Falling back to local storage.")

        # Fallback to local storage
        local_dest = os.path.join(self.local_dir, destination_path.replace("/", "_"))
        with open(local_dest, "wb") as f:
            f.write(file_bytes)
        logger.info(f"Stored file locally at: {local_dest}")
        return f"local://{local_dest}"

    def delete_file(self, storage_path: str) -> bool:
        """Deletes a file from Supabase or local storage."""
        if storage_path.startswith("supabase://") and self.client:
            try:
                path_in_bucket = storage_path.replace(f"supabase://{self.bucket}/", "")
                self.client.storage.from_(self.bucket).remove([path_in_bucket])
                return True
            except Exception as e:
                logger.warning(f"Failed to delete {storage_path} from Supabase: {e}")

        elif storage_path.startswith("local://"):
            local_path = storage_path.replace("local://", "")
            if os.path.exists(local_path):
                os.remove(local_path)
                return True

        return True


storage_service = StorageService()
