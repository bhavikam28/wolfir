"""
User-friendly error messages — avoid exposing raw Python exceptions to frontend.
"""
import re


def user_friendly_message(exc: Exception, fallback: str = "An unexpected error occurred") -> str:
    """
    Map common exceptions to user-friendly messages.
    Avoids exposing internal paths, connection details, or stack traces.
    """
    msg = str(exc).strip()
    if not msg:
        return fallback
    msg_lower = msg.lower()
    # Connection / network
    if "connection refused" in msg_lower or "connection reset" in msg_lower:
        return "Unable to connect to the server. Please check your network and try again."
    if "timeout" in msg_lower or "timed out" in msg_lower:
        return "The request timed out. Please try again."
    if "connection" in msg_lower and ("error" in msg_lower or "failed" in msg_lower):
        return "Network connection error. Please check your connection and try again."
    # AWS / Bedrock
    if "throttling" in msg_lower or "rate exceeded" in msg_lower:
        return "Service is busy. Please wait a moment and try again."
    if "access denied" in msg_lower or "unauthorized" in msg_lower:
        return "Access denied. Please check your AWS credentials and permissions."
    if "credentials" in msg_lower:
        return "AWS credentials are missing or invalid. Please configure your credentials."
    if "bedrock" in msg_lower and ("failed" in msg_lower or "error" in msg_lower):
        return "AI model request failed. Please try again or check Bedrock access."
    # Generic path/stack leak prevention — if it looks like a path, don't expose
    if re.search(r"[a-z]:\\|/home/|/Users/|\.py\b|line \d+", msg, re.I):
        return fallback
    # Keep short, sanitized messages (e.g. "events must be valid JSON")
    if len(msg) < 120 and not any(c in msg for c in ["\n", "Traceback", "File ", "  File"]):
        return msg
    return fallback
