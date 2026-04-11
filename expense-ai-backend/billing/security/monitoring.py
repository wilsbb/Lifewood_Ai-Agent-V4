import hashlib
import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, UTC
from typing import Any, Dict, List


logger = logging.getLogger("billing.llm_security")


@dataclass
class AuditEvent:
    event_type: str
    user_id: int | None
    conversation_id: int | None
    prompt_hash: str
    risk_score: int
    reasons: List[str]
    blocked: bool
    metadata: Dict[str, Any]
    created_at: str


class SecurityMonitor:
    """Captures security-relevant telemetry for incident response and tuning."""

    def record(
        self,
        *,
        event_type: str,
        prompt_text: str,
        risk_score: int,
        reasons: List[str],
        blocked: bool,
        user_id: int | None = None,
        conversation_id: int | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> AuditEvent:
        prompt_hash = hashlib.sha256((prompt_text or "").encode("utf-8")).hexdigest()
        event = AuditEvent(
            event_type=event_type,
            user_id=user_id,
            conversation_id=conversation_id,
            prompt_hash=prompt_hash,
            risk_score=risk_score,
            reasons=reasons,
            blocked=blocked,
            metadata=metadata or {},
            created_at=datetime.now(UTC).isoformat(),
        )
        logger.warning("llm_security_event=%s", json.dumps(asdict(event), sort_keys=True))
        return event
