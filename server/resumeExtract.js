import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import { extractText, getDocumentProxy } from 'unpdf';

const MAX_CHARS = 60000;

function extensionOf(fileName = '') {
  const parts = String(fileName).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function normalizeExtractedText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS);
}

async function extractPdf(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join('\n') : String(text || '');
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

async function extractDoc(buffer) {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return [doc.getBody(), doc.getHeaders(), doc.getFooters()].filter(Boolean).join('\n');
}

/**
 * Extract plain text from an uploaded resume file.
 * Supports: pdf, docx, doc, txt
 */
export async function extractResumeTextFromFile({
  buffer,
  fileName = '',
  mimeType = '',
} = {}) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Empty file');
  }

  const ext = extensionOf(fileName);
  const mime = String(mimeType || '').toLowerCase();

  let raw = '';

  if (ext === 'txt' || mime === 'text/plain') {
    raw = buffer.toString('utf8');
  } else if (ext === 'pdf' || mime === 'application/pdf') {
    raw = await extractPdf(buffer);
  } else if (
    ext === 'docx' ||
    mime.includes('officedocument.wordprocessingml') ||
    mime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  ) {
    raw = await extractDocx(buffer);
  } else if (ext === 'doc' || mime === 'application/msword') {
    raw = await extractDoc(buffer);
  } else {
    throw new Error('Unsupported file type. Upload a PDF, DOC, DOCX, or TXT resume.');
  }

  const text = normalizeExtractedText(raw);
  if (text.length < 40) {
    throw new Error(
      'Could not read enough text from that file. Try another export (PDF/DOCX) or paste the resume text.'
    );
  }

  return text;
}

export const RESUME_UPLOAD_ACCEPT = {
  extensions: ['pdf', 'doc', 'docx', 'txt'],
  maxBytes: 8 * 1024 * 1024,
};
