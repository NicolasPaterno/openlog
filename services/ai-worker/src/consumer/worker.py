import json
import logging
import time

import pika

from src.analyzer.chain import LogAnalyzerChain
from src.db.repository import LogRepository

logger = logging.getLogger(__name__)


class LogConsumer:
    def __init__(
        self,
        rabbitmq_url: str,
        queue_name: str,
        repository: LogRepository,
        analyzer: LogAnalyzerChain,
        max_retries: int = 5,
    ):
        self.rabbitmq_url = rabbitmq_url
        self.queue_name = queue_name
        self.repository = repository
        self.analyzer = analyzer
        self.max_retries = max_retries
        self._connection = None
        self._channel = None

    def connect(self):
        self._connection = self._connect_with_retry()
        self._channel = self._connection.channel()
        self._channel.queue_declare(queue=self.queue_name, durable=True)
        self._channel.basic_qos(prefetch_count=1)
        logger.info("Connected to RabbitMQ, consuming queue '%s'", self.queue_name)

    def start(self):
        self._channel.basic_consume(
            queue=self.queue_name,
            on_message_callback=self._on_message,
        )
        logger.info("AI Worker waiting for messages...")
        self._channel.start_consuming()

    def _on_message(self, channel, method, properties, body):
        try:
            msg = json.loads(body)
            log_id = msg.get("log_id")
            logger.info("Processing log_id=%d", log_id)

            log_entry = self.repository.get_log_by_id(log_id)
            if log_entry is None:
                logger.error("Log %d not found in database, skipping", log_id)
                channel.basic_ack(delivery_tag=method.delivery_tag)
                return

            diagnostic = self.analyzer.analyze(log_entry)

            self.repository.insert_diagnostic(
                log_id=log_id,
                summary=diagnostic["summary"],
                severity=diagnostic["severity"],
                suggestion=diagnostic["suggestion"],
                model_used=diagnostic["model_used"],
                tokens_used=diagnostic["tokens_used"],
            )

            channel.basic_ack(delivery_tag=method.delivery_tag)
            logger.info("Log %d analyzed: severity=%s", log_id, diagnostic["severity"])

        except json.JSONDecodeError:
            logger.error("Invalid JSON message, discarding: %s", body[:200])
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception:
            logger.exception("Failed to process log_id=%s, requeuing", msg.get("log_id", "?"))
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
            time.sleep(5)

    def _connect_with_retry(self) -> pika.BlockingConnection:
        params = pika.URLParameters(self.rabbitmq_url)

        for attempt in range(1, self.max_retries + 1):
            try:
                conn = pika.BlockingConnection(params)
                return conn
            except pika.exceptions.AMQPConnectionError as e:
                wait = 2 ** (attempt - 1)
                logger.warning(
                    "RabbitMQ not ready (attempt %d/%d), retrying in %ds: %s",
                    attempt, self.max_retries, wait, e,
                )
                time.sleep(wait)

        raise RuntimeError(f"Could not connect to RabbitMQ after {self.max_retries} attempts")

    def close(self):
        if self._connection and self._connection.is_open:
            self._connection.close()
