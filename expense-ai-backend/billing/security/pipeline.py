from dataclasses import asdict

from .compliance import build_compliance_descriptor
from .context_manager import SecureContextManager
from .external_sanitizer import ExternalContentSanitizer
from .input_validation import PromptInputValidator
from .monitoring import SecurityMonitor
from .output_filter import OutputPolicyEnforcer


class LLMSecurityPipeline:
    """Reusable wrapper for securing prompt construction and model responses."""

    def __init__(self):
        self.input_validator = PromptInputValidator()
        self.output_enforcer = OutputPolicyEnforcer()
        self.context_manager = SecureContextManager()
        self.external_sanitizer = ExternalContentSanitizer()
        self.monitor = SecurityMonitor()

    def protect_input(self, text: str):
        return self.input_validator.validate(text)

    def sanitize_external(self, text: str, mime_type: str | None = None) -> str:
        return self.external_sanitizer.sanitize_by_mime(text, mime_type)

    def build_context(self, **kwargs):
        return self.context_manager.build_messages(**kwargs)

    def protect_output(self, text: str):
        return self.output_enforcer.filter(text)

    def compliance_metadata(self) -> dict:
        return build_compliance_descriptor()

    def serialize_audit_event(self, event):
        return asdict(event)
