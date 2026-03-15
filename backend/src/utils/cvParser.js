import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

/**
 * Extract plain text from a CV file buffer.
 *
 * @param {Buffer} buffer   - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>}
 */
export async function extractCvText(buffer, mimetype) {
  // PDF
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer)
    return data.text.trim()
  }

  // DOCX
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  // Plain text fallback
  return buffer.toString('utf-8').trim()
}
