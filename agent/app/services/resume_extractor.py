import pdfplumber
from docx import Document

def extract_resume_text(path: str) -> str:
    if path.endswith(".pdf"):
        return _extract_pdf(path)
    if path.endswith(".docx"):
        return _extract_docx(path)
    return ""

def _extract_pdf(path: str) -> str:
    text = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            content = page.extract_text()
            if content:
                text.append(content)
    return "\n".join(text)

def _extract_docx(path: str) -> str:
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text)