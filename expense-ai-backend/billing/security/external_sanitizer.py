import re
import unicodedata


SCRIPT_STYLE_PATTERN = re.compile(r"(?is)<(script|style).*?>.*?</\1>")
HTML_TAG_PATTERN = re.compile(r"(?is)<[^>]+>")
HTML_COMMENT_PATTERN = re.compile(r"(?is)<!--.*?-->")
PROMPT_META_PATTERN = re.compile(
    r"(?im)^\s*(system prompt|developer note|ignore previous instructions|assistant instruction)\s*:.*$"
)


class ExternalContentSanitizer:
    """Sanitizes HTML, PDFs, emails, or API text before it becomes model context."""

    def sanitize_text(self, text: str) -> str:
        cleaned = unicodedata.normalize("NFKC", text or "")
        cleaned = cleaned.replace("\x00", " ")
        cleaned = PROMPT_META_PATTERN.sub("[stripped-untrusted-instruction]", cleaned)
        cleaned = re.sub(r"[\u200B-\u200F\u2060\uFEFF]", "", cleaned)
        cleaned = re.sub(r"\s{3,}", " ", cleaned)
        return cleaned.strip()

    def sanitize_html(self, html: str) -> str:
        text = SCRIPT_STYLE_PATTERN.sub(" ", html or "")
        text = HTML_COMMENT_PATTERN.sub(" ", text)
        text = HTML_TAG_PATTERN.sub(" ", text)
        return self.sanitize_text(text)

    def sanitize_by_mime(self, content: str, mime_type: str | None = None) -> str:
        if mime_type and "html" in mime_type.lower():
            return self.sanitize_html(content)
        return self.sanitize_text(content)
