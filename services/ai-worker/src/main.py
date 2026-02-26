import logging
import sys

from src.config import load_settings
from src.db.repository import LogRepository
from src.analyzer.chain import LogAnalyzerChain
from src.consumer.worker import LogConsumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ai-worker")


def main():
    logger.info("Starting AI Worker...")

    settings = load_settings()
    logger.info("Config loaded: provider=%s, model=%s", settings.llm_provider, settings.llm_model)

    repository = LogRepository(settings.database_url)
    logger.info("Database connection ready")

    analyzer = LogAnalyzerChain(
        provider=settings.llm_provider,
        model=settings.llm_model,
        ollama_base_url=settings.ollama_base_url,
        openai_api_key=settings.openai_api_key,
    )
    logger.info("LangChain analyzer initialized (%s/%s)", settings.llm_provider, settings.llm_model)

    consumer = LogConsumer(
        rabbitmq_url=settings.rabbitmq_url,
        queue_name=settings.rabbitmq_queue,
        repository=repository,
        analyzer=analyzer,
        max_retries=settings.rabbitmq_max_retries,
    )

    try:
        consumer.connect()
        consumer.start()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        consumer.close()
        repository.close()
        logger.info("AI Worker stopped")


if __name__ == "__main__":
    main()
