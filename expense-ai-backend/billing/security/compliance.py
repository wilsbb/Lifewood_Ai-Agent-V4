from dataclasses import dataclass, asdict


@dataclass
class ComplianceDescriptor:
    standards: list[str]
    controls: list[str]
    zero_trust: bool


def build_compliance_descriptor() -> dict:
    """
    Documents implemented controls for OWASP LLM01 and NIST AI RMF-oriented audits.
    """
    descriptor = ComplianceDescriptor(
        standards=["OWASP LLM01: Prompt Injection", "NIST AI RMF: Govern, Map, Manage"],
        controls=[
            "Input validation and adversarial token neutralization",
            "Output policy enforcement and sensitive-data filtering",
            "Strict context isolation for trusted vs untrusted content",
            "Indirect injection sanitization for external sources",
            "Audit logging and anomaly detection for incident response",
            "Zero-trust handling of all external content before model use",
        ],
        zero_trust=True,
    )
    return asdict(descriptor)
