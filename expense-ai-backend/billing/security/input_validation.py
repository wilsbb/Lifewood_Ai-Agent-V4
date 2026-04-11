import re
import unicodedata
from dataclasses import dataclass, field
from typing import List


INJECTION_PATTERNS = [
    re.compile(r"(?i)\b(ignore|override|bypass)\b.{0,40}\b(instruction|system|policy|guardrail)s?\b"),
    re.compile(r"(?i)\b(reveal|show|print|dump|expose)\b.{0,40}\b(system prompt|hidden prompt|developer message|secret)\b"),
    re.compile(r"(?i)<\s*/?\s*(system|assistant|tool)\s*>"),
    re.compile(r"(?i)\b(do anything now|dan|jailbreak|prompt injection)\b"),
    re.compile(r"(?i)\b(base64|hex|rot13)\b.{0,25}\b(decode|payload|instruction)\b"),
    re.compile(r"(?i)`{3,}.*?(sudo|powershell|cmd\.exe|rm\s+-rf|curl\s+.+\|\s*(sh|bash))", re.DOTALL),
]

CONTROL_CHAR_PATTERN = re.compile(r"[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]")
INVISIBLE_CHAR_PATTERN = re.compile(r"[\u200B-\u200F\u2060\uFEFF]")


@dataclass
class ValidationResult:
    sanitized_text: str
    flagged: bool
    blocked: bool
    reasons: List[str] = field(default_factory=list)
    risk_score: int = 0


class PromptInputValidator:
    """Normalizes user input and downgrades common prompt-injection techniques."""

    def __init__(self, max_length: int = 6000):
        self.max_length = max_length

    def validate(self, text: str) -> ValidationResult:
        original = text or ""
        normalized = unicodedata.normalize("NFKC", original)
        normalized = CONTROL_CHAR_PATTERN.sub(" ", normalized)
        normalized = INVISIBLE_CHAR_PATTERN.sub("", normalized)
        normalized = re.sub(r"\r\n?", "\n", normalized)
        normalized = re.sub(r"[ \t]{2,}", " ", normalized).strip()

        reasons: List[str] = []
        flagged = False
        blocked = False
        risk_score = 0

        for pattern in INJECTION_PATTERNS:
            if pattern.search(normalized):
                flagged = True
                risk_score += 25
                reasons.append(f"matched:{pattern.pattern[:40]}")

        if len(normalized) > self.max_length:
            normalized = normalized[: self.max_length]
            flagged = True
            risk_score += 10
            reasons.append("truncated:oversized_input")

        dense_marker_count = len(re.findall(r"[<>{}\[\]`]{2,}", normalized))
        if dense_marker_count >= 5:
            flagged = True
            risk_score += 15
            reasons.append("marker_density")

        if risk_score >= 50:
            blocked = True

        # Preserve user intent while preventing role-tag confusion inside prompt assembly.
        neutralized = (
            normalized.replace("<system>", "&lt;system&gt;")
            .replace("</system>", "&lt;/system&gt;")
            .replace("<assistant>", "&lt;assistant&gt;")
            .replace("</assistant>", "&lt;/assistant&gt;")
            .replace("<tool>", "&lt;tool&gt;")
            .replace("</tool>", "&lt;/tool&gt;")
        )
        return ValidationResult(
            sanitized_text=neutralized,
            flagged=flagged,
            blocked=blocked,
            reasons=reasons,
            risk_score=min(risk_score, 100),
        )
