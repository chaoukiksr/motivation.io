import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType,
} from 'docx'

export function useDocxExport() {
  async function exportToDocx(filename = 'motivation-letter') {
    const el = document.getElementById('letter-content')
    if (!el) return

    const rawText = el.innerText ?? ''

    // Split into paragraphs (blank lines = paragraph break)
    const paragraphs = rawText.split(/\n{2,}/).map(block => {
      const lines = block.split('\n').filter(l => l.trim() !== '')
      // Each block becomes one Paragraph; internal newlines become line breaks
      const runs = []
      lines.forEach((line, i) => {
        runs.push(new TextRun({ text: line, break: i > 0 ? 1 : 0 }))
      })
      return new Paragraph({
        children: runs,
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
      })
    })

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top:    1440,
              bottom: 1440,
              left:   1440,
              right:  1440,
            },
          },
        },
        children: paragraphs,
      }],
    })

    const blob = await Packer.toBlob(doc)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${filename}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { exportToDocx }
}
