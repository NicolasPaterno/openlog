import json
import logging
from datetime import datetime, timezone
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class LogRepository:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self._connection = None

    def _get_connection(self):
        if self._connection is None or self._connection.closed:
            self._connection = psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)
            self._connection.autocommit = True
        return self._connection

    def get_log_by_id(self, log_id: int) -> Optional[dict]:
        connection = self._get_connection()
        with connection.cursor() as cur:
            cur.execute(
                "SELECT id, source, level, message, metadata, created_at FROM logs WHERE id = %s",
                (log_id,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            result = dict(row)
            if isinstance(result.get("metadata"), str):
                result["metadata"] = json.loads(result["metadata"])
            return result

    def insert_diagnostic(
        self,
        log_id: int,
        summary: str,
        severity: str,
        suggestion: Optional[str],
        model_used: str,
        tokens_used: int = 0,
    ) -> int:
        connection = self._get_connection()
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO diagnostics (log_id, summary, severity, suggestion, model_used, tokens_used)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (log_id, summary, severity, suggestion, model_used, tokens_used),
            )
            row = cur.fetchone()
            diagnostic_id = row["id"]
            logger.info("Diagnostic %d saved for log %d", diagnostic_id, log_id)
            return diagnostic_id

    def close(self):
        if self._connection and not self._connection.closed:
            self._connection.close()
