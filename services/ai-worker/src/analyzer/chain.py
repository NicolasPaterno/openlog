import json
import logging
from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert DevOps and SRE log analyst. 
Analyze the following application log entry and provide a structured diagnostic.

You MUST respond with a valid JSON object containing exactly these fields:
- "summary": A concise 1-2 sentence explanation of the issue
- "severity": One of "low", "medium", "high", "critical"
- "suggestion": A concrete actionable recommendation to fix or investigate the issue

Severity guidelines:
- "low": Informational, no immediate action needed (DEBUG/INFO logs with minor anomalies)
- "medium": Worth investigating, potential issue (WARN logs, elevated latency)
- "high": Requires attention soon (ERROR logs, service degradation)
- "critical": Immediate action needed (FATAL logs, complete service failure, data loss risk)

Respond ONLY with the JSON object, no additional text."""

HUMAN_PROMPT = """Log Entry:
- Source: {source}
- Level: {level}
- Message: {message}
- Metadata: {metadata}"""


class LogAnalyzerChain:
    def __init__(self, provider: str, model: str, ollama_base_url: str = "", openai_api_key: Optional[str] = None):
        self.model_name = model
        self.llm = self._create_llm(provider, model, ollama_base_url, openai_api_key)
        self.parser = JsonOutputParser()
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", HUMAN_PROMPT),
        ])
        self.chain = self.prompt | self.llm | self.parser

    def _create_llm(self, provider: str, model: str, ollama_base_url: str, openai_api_key: Optional[str]):
        if provider == "ollama":
            from langchain_ollama import ChatOllama
            return ChatOllama(model=model, base_url=ollama_base_url, temperature=0.1)
        elif provider == "openai":
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(model=model, api_key=openai_api_key, temperature=0.1)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}. Use 'ollama' or 'openai'.")

    def analyze(self, log_entry: dict) -> dict:
        metadata_str = json.dumps(log_entry.get("metadata", {}), indent=2)

        result = self.chain.invoke({
            "source": log_entry["source"],
            "level": log_entry["level"],
            "message": log_entry["message"],
            "metadata": metadata_str,
        })

        valid_severities = {"low", "medium", "high", "critical"}
        if result.get("severity") not in valid_severities:
            logger.warning("LLM returned invalid severity '%s', defaulting to 'medium'", result.get("severity"))
            result["severity"] = "medium"

        return {
            "summary": result.get("summary", "No summary provided"),
            "severity": result["severity"],
            "suggestion": result.get("suggestion", "No suggestion provided"),
            "model_used": f"{self.model_name}",
            "tokens_used": 0,
        }
