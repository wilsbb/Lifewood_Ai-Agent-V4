# LLM Defense Layers

This package implements defense-in-depth controls aligned to `OWASP LLM01` and the `NIST AI RMF`.

Files:
- `input_validation.py`: normalizes user prompts, detects prompt-injection markers, and neutralizes role-tag confusion.
- `output_filter.py`: blocks unsafe responses, secret leakage, and unauthorized command execution content.
- `context_manager.py`: isolates trusted instructions, external data, history, and current user input.
- `external_sanitizer.py`: strips hidden instructions and markup from HTML, email, PDF text, and API content.
- `monitoring.py`: emits structured audit events for anomaly detection and incident response.
- `pipeline.py`: integration wrapper for agent, chatbot, or RAG pipelines.

Zero trust notes:
- All external text is treated as untrusted until sanitized.
- Untrusted data is enclosed separately from system policy before being sent to the model.
- Model output is filtered before being returned to users or forwarded to automation layers.
