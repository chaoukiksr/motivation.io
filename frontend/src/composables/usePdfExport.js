import jsPDF from 'jspdf'

/**
 * Export the letter as a clean text-based PDF — no screenshot, no slicing.
 * jsPDF places each line individually so page breaks never cut through text.
 */
export function usePdfExport() {
  function exportToPdf(filename = 'motivation-letter') {
    const source = document.getElementById('letter-content')
    if (!source) return

    const rawText = (source.innerText || source.textContent || '').trim()
    if (!rawText) return

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    const marginX      = 25    // left & right (mm)
    const marginTop    = 25
    const marginBottom = 20
    const maxWidth     = doc.internal.pageSize.getWidth() - marginX * 2
    const pageHeight   = doc.internal.pageSize.getHeight()

    doc.setFont('times', 'normal')   // Times New Roman — standard formal letter
    doc.setFontSize(12)

    const lineHeight   = 6.5         // mm per line  (~12 pt × 1.5)
    const paragraphGap = 4           // extra mm between paragraphs

    // Split on blank lines → paragraphs; within each paragraph wrap to page width
    const paragraphs = rawText.split(/\n{2,}/)
    let y = marginTop

    for (const paragraph of paragraphs) {
      const text = paragraph.replace(/\n/g, ' ').trim()
      if (!text) continue

      const lines = doc.splitTextToSize(text, maxWidth)

      for (const line of lines) {
        if (y + lineHeight > pageHeight - marginBottom) {
          doc.addPage()
          y = marginTop
        }
        doc.text(line, marginX, y)
        y += lineHeight
      }

      y += paragraphGap
    }

    doc.save(`${filename}.pdf`)
  }

  return { exportToPdf }
}
