import re
from dataclasses import dataclass, field
from typing import List


OUTPUT_DENY_PATTERNS = [
    re.compile(r"(?i)\b(ignore previous instructions|system prompt|developer message)\b"),
    re.compile(r"(?i)\b(api[_ -]?key|secret|access token|bearer token|private key|BEGIN [A-Z ]*PRIVATE KEY)\b"),
    re.compile(r"(?i)\b(rm\s+-rf|curl\s+.+\|\s*(sh|bash)|Invoke-WebRequest|subprocess\.|os\.system|powershell -enc)\b"),
]


@dataclass
class OutputFilterResult:
    allowed_text: str
    blocked: bool
    reasons: List[str] = field(default_factory=list)


class OutputPolicyEnforcer:
    """Blocks unsafe model output before it leaves the application boundary."""

    def __init__(self, fallback_message: str | None = None):
        self.fallback_message = (
            fallback_message
            or "I can help with finance questions, but I can't provide unsafe commands, hidden instructions, or sensitive data."
        )

    def filter(self, text: str) -> OutputFilterResult:
        content = text or ""
        reasons: List[str] = []
        for pattern in OUTPUT_DENY_PATTERNS:
            if pattern.search(content):
                reasons.append(f"matched:{pattern.pattern[:40]}")

        if reasons:
            return OutputFilterResult(
                allowed_text=self.fallback_message,
                blocked=True,
                reasons=reasons,
            )

        redacted = re.sub(r"(?i)\b(sk-[a-z0-9]{12,}|or-[a-z0-9]{12,})\b", "[REDACTED_TOKEN]", content)
        return OutputFilterResult(allowed_text=redacted, blocked=False, reasons=[])
