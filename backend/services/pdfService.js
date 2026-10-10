const pdfParse = require('pdf-parse');

async function extractTextFromPDF(buffer) {
  // pdf-parse v1.1.1 exports a default function
  const parse = typeof pdfParse === 'function' ? pdfParse : pdfParse.default || pdfParse.PDFParse;
  if (typeof parse !== 'function') {
    // Last resort: just decode as UTF-8 text
    console.warn('pdf-parse did not export a callable function, treating buffer as text');
    return buffer.toString('utf-8');
  }
  const data = await parse(buffer);
  return data.text || '';
}

module.exports = { extractTextFromPDF };
