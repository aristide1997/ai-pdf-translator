# PDF Translator

Browser-based PDF translation using Google's Gemini vision models. Translates PDF documents while preserving structure through markdown formatting.

## What It Does

Converts PDF pages to images and translates them using AI. Maintains terminology consistency across pages and exports results as markdown with proper formatting (headings, paragraphs, lists, etc.).

## Setup

1. Clone the repository
2. Get a Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
3. Run locally:
```bash
./run.sh
```
4. Open http://localhost:8000
5. Upload PDF, enter API key, select target language, translate

## Features

- Side-by-side comparison of original and translated pages
- Maintains context between pages for consistent terminology
- Exports as downloadable markdown file
- Client-side only - API key stays in your browser

## Supported Languages

Spanish, French, German, Italian, Portuguese, Chinese (Simplified/Traditional), Japanese, Korean, Russian, Arabic, Hindi

## Output Format

Markdown file with page separators:
```markdown
# Page 1

[Translated content]

---

# Page 2

[Translated content]

---
```

## Dependencies

Loaded via CDN:
- PDF.js 3.11.174
- marked.js 11.1.1
- @google/genai 1.21.0

## Privacy

Your API key is only used in your browser and sent directly to Google's Gemini API. No data passes through any other server.
