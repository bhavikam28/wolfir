"""
Embedding Service — Nova Multimodal Embeddings for semantic similarity.
Uses amazon.nova-2-multimodal-embeddings-v1:0 for incident correlation.
"""
import json
import asyncio
from typing import List, Optional

from utils.config import get_settings
from utils.logger import logger

# Cosine similarity
def _cosine_sim(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def embed_text(text: str, dimension: int = 384) -> Optional[List[float]]:
    """
    Embed text using Nova Multimodal Embeddings.
    Returns list of floats or None if embedding fails.
    """
    if not text or not text.strip():
        return None
    try:
        import boto3
        client = boto3.client("bedrock-runtime", region_name=get_settings().aws_region)
        body = {
            "taskType": "SINGLE_EMBEDDING",
            "singleEmbeddingParams": {
                "embeddingPurpose": "TEXT_RETRIEVAL",
                "embeddingDimension": dimension,
                "text": {"truncationMode": "END", "value": text[:8000]},
            },
        }
        response = await asyncio.to_thread(
            client.invoke_model,
            body=json.dumps(body),
            modelId="amazon.nova-2-multimodal-embeddings-v1:0",
            accept="application/json",
            contentType="application/json",
        )
        result = json.loads(response["body"].read())
        emb = result.get("embedding", result.get("embeddings", [[]]))[0]
        if isinstance(emb, list) and len(emb) == dimension:
            return emb
        return None
    except Exception as e:
        logger.warning(f"Embedding failed: {e}")
        return None


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two embedding vectors."""
    return _cosine_sim(a, b)
