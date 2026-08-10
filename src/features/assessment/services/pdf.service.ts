import jsPDF from 'jspdf'

import { translate as t } from '@/shared/i18n/i18n.service'

import type { AssessmentResult, ChecklistState } from '../types/assessment'
import type { KitItem } from '../types/kit'
import type { PrioritizedAction } from '../types/recommendation'
import type { Source } from '../types/source'

interface PdfInput {
  result: AssessmentResult
  immediateActions: PrioritizedAction[]
  weekActions: PrioritizedAction[]
  checklist: ChecklistState
  checklistItems: Array<{
    id: string
    label: string
    completed: boolean
  }>
  kitItems: KitItem[]
  sources: Source[]
}

interface ChecklistPdfItem {
  id: string
  label: string
  completed: boolean
  meta?: string
}

interface ChecklistPdfInput {
  recommendedItems: ChecklistPdfItem[]
  customItems: ChecklistPdfItem[]
  completedCount: number
  totalCount: number
}

interface QuizAttestationInput {
  score: number
  total: number
}

interface VideoAttestationInput {
  totalCount: number
}

interface PdfOutputOptions {
  mode?: 'download' | 'print'
}

const colors = {
  primary: [0, 109, 119] as const,
  primaryDark: [0, 81, 91] as const,
  teal: [42, 157, 143] as const,
  warning: [244, 162, 97] as const,
  paper: [251, 253, 253] as const,
  border: [202, 219, 224] as const,
  text: [16, 42, 67] as const,
  muted: [82, 97, 107] as const,
}

function sanitizePdfText(text: string): string {
  const withoutControlCharacters = Array.from(text)
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
    })
    .join('')

  return withoutControlCharacters
    .replace(/[^\S\r\n]+/g, ' ')
    .trim()
    .slice(0, 500)
}

function setTextColor(pdf: jsPDF, color: readonly [number, number, number]) {
  pdf.setTextColor(color[0], color[1], color[2])
}

function setDrawColor(pdf: jsPDF, color: readonly [number, number, number]) {
  pdf.setDrawColor(color[0], color[1], color[2])
}

function setFillColor(pdf: jsPDF, color: readonly [number, number, number]) {
  pdf.setFillColor(color[0], color[1], color[2])
}

function addDiplomaFrame(pdf: jsPDF) {
  setFillColor(pdf, colors.paper)
  pdf.rect(0, 0, 210, 297, 'F')

  setDrawColor(pdf, colors.primary)
  pdf.setLineWidth(1.1)
  pdf.roundedRect(12, 12, 186, 273, 4, 4)

  setDrawColor(pdf, colors.warning)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(17, 17, 176, 263, 3, 3)

  setDrawColor(pdf, colors.border)
  pdf.setLineWidth(0.25)
  pdf.line(28, 48, 182, 48)
  pdf.line(28, 246, 182, 246)
}

function addMiniLogo(pdf: jsPDF, x: number, y: number) {
  setDrawColor(pdf, colors.primary)
  setFillColor(pdf, [255, 255, 255])
  pdf.setLineWidth(0.7)
  pdf.roundedRect(x, y, 18, 20, 2, 2, 'FD')

  setDrawColor(pdf, colors.teal)
  pdf.line(x + 4, y + 12, x + 9, y + 7)
  pdf.line(x + 9, y + 7, x + 14, y + 12)
  pdf.line(x + 5, y + 12, x + 5, y + 17)
  pdf.line(x + 13, y + 12, x + 13, y + 17)
  pdf.line(x + 5, y + 17, x + 13, y + 17)

  setDrawColor(pdf, colors.warning)
  pdf.line(x + 4, y + 18, x + 9, y + 14)
  pdf.line(x + 9, y + 14, x + 14, y + 18)
}

function addSeal(pdf: jsPDF, score: number) {
  const centerY = 143

  setFillColor(pdf, colors.primary)
  pdf.circle(105, centerY, 20, 'F')

  setDrawColor(pdf, colors.warning)
  pdf.setLineWidth(1.8)
  pdf.circle(105, centerY, 16, 'S')

  setTextColor(pdf, [255, 255, 255])
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(21)
  pdf.text(`${score}`, 105, centerY - 2, { align: 'center' })
  pdf.setFontSize(8)
  pdf.text('/100', 105, centerY + 6, { align: 'center' })
}

function addCenteredText(
  pdf: jsPDF,
  text: string,
  y: number,
  options: { size: number; bold?: boolean; color?: readonly [number, number, number] },
) {
  setTextColor(pdf, options.color ?? colors.text)
  pdf.setFont('helvetica', options.bold ? 'bold' : 'normal')
  pdf.setFontSize(options.size)
  pdf.text(sanitizePdfText(text), 105, y, { align: 'center' })
}

function addCertificatePage(pdf: jsPDF, input: PdfInput) {
  const currentDate = new Date().toLocaleDateString(t('pdf.dateLocale'))

  addDiplomaFrame(pdf)
  addMiniLogo(pdf, 31, 25)

  setTextColor(pdf, colors.primaryDark)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(t('brand.name'), 54, 33)
  pdf.setFontSize(10)
  pdf.text(t('pdf.brandSubtitle'), 54, 40)

  addCenteredText(pdf, t('pdf.certificateTitle'), 72, {
    size: 25,
    bold: true,
    color: colors.primaryDark,
  })
  addCenteredText(pdf, t('pdf.certificateSubtitle'), 84, {
    size: 12,
    color: colors.muted,
  })

  addCenteredText(pdf, t('pdf.certificateLine1'), 104, {
    size: 11,
  })
  addCenteredText(pdf, t('pdf.certificateLine2'), 112, {
    size: 11,
  })

  addSeal(pdf, input.result.globalScore)

  addCenteredText(pdf, input.result.level.label, 174, {
    size: 18,
    bold: true,
    color: colors.primary,
  })
  addCenteredText(pdf, input.result.level.message, 186, {
    size: 10,
    color: colors.muted,
  })

  setFillColor(pdf, [237, 247, 247])
  setDrawColor(pdf, colors.border)
  pdf.roundedRect(38, 201, 134, 24, 3, 3, 'FD')
  addCenteredText(pdf, t('pdf.generatedAt', { date: currentDate }), 211, {
    size: 10,
    bold: true,
  })
  addCenteredText(pdf, t('pdf.version'), 219, {
    size: 9,
    color: colors.muted,
  })

  addCenteredText(pdf, t('pdf.disclaimer'), 260, {
    size: 8.5,
    color: colors.muted,
  })
}

function createAnnexWriter(pdf: jsPDF) {
  let y = 24

  const addPageIfNeeded = (height = 8) => {
    if (y + height > 275) {
      pdf.addPage()
      y = 24
      addAnnexHeader(pdf)
    }
  }

  const addTitle = (text: string) => {
    addPageIfNeeded(16)
    setDrawColor(pdf, colors.warning)
    pdf.setLineWidth(1.2)
    pdf.line(15, y - 5, 15, y + 3)

    setTextColor(pdf, colors.primaryDark)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(15)
    pdf.text(sanitizePdfText(text), 20, y)
    y += 10
  }

  const addText = (text: string, indent = 15) => {
    const lines = pdf.splitTextToSize(sanitizePdfText(text), 180 - (indent - 15))
    addPageIfNeeded(lines.length * 6)
    setTextColor(pdf, colors.text)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(lines, indent, y)
    y += lines.length * 6
  }

  const addChecklistItem = (item: { label: string; completed: boolean; meta?: string }) => {
    const labelLines = pdf.splitTextToSize(sanitizePdfText(item.label), 160)
    const metaLines = item.meta ? pdf.splitTextToSize(sanitizePdfText(item.meta), 160) : []
    const blockHeight = Math.max(9, labelLines.length * 5.5 + metaLines.length * 4.8 + 2)

    addPageIfNeeded(blockHeight)

    const boxX = 15
    const boxY = y - 4

    setDrawColor(pdf, item.completed ? colors.primary : colors.border)
    setFillColor(pdf, item.completed ? colors.primary : [255, 255, 255])
    pdf.setLineWidth(0.45)
    pdf.roundedRect(boxX, boxY, 4.7, 4.7, 0.8, 0.8, item.completed ? 'FD' : 'S')

    if (item.completed) {
      setDrawColor(pdf, [255, 255, 255])
      pdf.setLineWidth(0.65)
      pdf.line(boxX + 1.1, boxY + 2.5, boxX + 2, boxY + 3.5)
      pdf.line(boxX + 2, boxY + 3.5, boxX + 3.7, boxY + 1.2)
    }

    setTextColor(pdf, colors.text)
    pdf.setFont('helvetica', item.completed ? 'bold' : 'normal')
    pdf.setFontSize(10)
    pdf.text(labelLines, 23, y)
    y += labelLines.length * 5.5

    if (metaLines.length > 0) {
      setTextColor(pdf, colors.muted)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.5)
      pdf.text(metaLines, 23, y)
      y += metaLines.length * 4.8
    }

    y += 2
  }

  return { addTitle, addText, addChecklistItem }
}

function addAnnexHeader(pdf: jsPDF) {
  setTextColor(pdf, colors.primaryDark)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text(t('pdf.annexHeader'), 15, 12)
  setDrawColor(pdf, colors.border)
  pdf.setLineWidth(0.25)
  pdf.line(15, 15, 195, 15)
}

function outputPdf(pdf: jsPDF, filename: string, options: PdfOutputOptions = {}) {
  if (options.mode === 'print') {
    pdf.autoPrint()
    const url = pdf.output('bloburl') as unknown as string
    const printWindow = window.open(url, '_blank', 'noopener,noreferrer')

    if (!printWindow) {
      pdf.save(filename)
    }

    return
  }

  pdf.save(filename)
}

function addChecklistCoverPage(pdf: jsPDF, input: ChecklistPdfInput) {
  const percent =
    input.totalCount === 0 ? 0 : Math.round((input.completedCount / input.totalCount) * 100)
  const currentDate = new Date().toLocaleDateString(t('pdf.dateLocale'))

  addDiplomaFrame(pdf)
  addMiniLogo(pdf, 31, 25)

  setTextColor(pdf, colors.primaryDark)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(t('brand.name'), 54, 33)
  pdf.setFontSize(10)
  pdf.text(t('pdf.brandSubtitle'), 54, 40)

  addCenteredText(pdf, t('pdf.checklistTitle'), 76, {
    size: 24,
    bold: true,
    color: colors.primaryDark,
  })
  addCenteredText(pdf, t('pdf.checklistSubtitle'), 89, {
    size: 11,
    color: colors.muted,
  })

  setFillColor(pdf, colors.primary)
  pdf.roundedRect(62, 118, 86, 38, 4, 4, 'F')
  setTextColor(pdf, [255, 255, 255])
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(22)
  pdf.text(`${input.completedCount}/${input.totalCount}`, 105, 134, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text(t('pdf.checklistCompleted', { percent }), 105, 146, { align: 'center' })

  addCenteredText(pdf, t('pdf.checklistHint'), 178, {
    size: 11,
  })
  addCenteredText(pdf, t('pdf.generatedAt', { date: currentDate }), 211, {
    size: 10,
    bold: true,
  })
  addCenteredText(pdf, t('pdf.checklistLocalNote'), 260, {
    size: 8.5,
    color: colors.muted,
  })
}

function addQuizAttestationPage(pdf: jsPDF, input: QuizAttestationInput) {
  const currentDate = new Date().toLocaleDateString(t('pdf.dateLocale'))
  const percent = input.total === 0 ? 0 : Math.round((input.score / input.total) * 100)

  addDiplomaFrame(pdf)
  addMiniLogo(pdf, 31, 25)

  setTextColor(pdf, colors.primaryDark)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(t('brand.name'), 54, 33)
  pdf.setFontSize(10)
  pdf.text(t('pdf.brandSubtitle'), 54, 40)

  addCenteredText(pdf, t('pdf.quizTitle'), 72, {
    size: 25,
    bold: true,
    color: colors.primaryDark,
  })
  addCenteredText(pdf, t('pdf.quizSubtitle'), 84, {
    size: 12,
    color: colors.muted,
  })

  addCenteredText(pdf, t('pdf.quizLine1'), 104, {
    size: 11,
  })

  addSeal(pdf, percent)

  addCenteredText(
    pdf,
    t('pdf.quizScoreLine', { score: input.score, total: input.total }),
    174,
    {
      size: 18,
      bold: true,
      color: colors.primary,
    },
  )

  setFillColor(pdf, [237, 247, 247])
  setDrawColor(pdf, colors.border)
  pdf.roundedRect(38, 201, 134, 24, 3, 3, 'FD')
  addCenteredText(pdf, t('pdf.generatedAt', { date: currentDate }), 211, {
    size: 10,
    bold: true,
  })

  addCenteredText(pdf, t('pdf.quizDisclaimer'), 260, {
    size: 8.5,
    color: colors.muted,
  })
}

export function generateQuizAttestationPdf(
  input: QuizAttestationInput,
  options: PdfOutputOptions = {},
): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  addQuizAttestationPage(pdf, input)
  outputPdf(pdf, 'attestation-quiz-resilience-976.pdf', options)
}

function addVideoAttestationPage(pdf: jsPDF, input: VideoAttestationInput) {
  const currentDate = new Date().toLocaleDateString(t('pdf.dateLocale'))

  addDiplomaFrame(pdf)
  addMiniLogo(pdf, 31, 25)

  setTextColor(pdf, colors.primaryDark)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text(t('brand.name'), 54, 33)
  pdf.setFontSize(10)
  pdf.text(t('pdf.brandSubtitle'), 54, 40)

  addCenteredText(pdf, t('pdf.videoTitle'), 72, {
    size: 25,
    bold: true,
    color: colors.primaryDark,
  })
  addCenteredText(pdf, t('pdf.videoSubtitle'), 84, {
    size: 12,
    color: colors.muted,
  })

  addCenteredText(pdf, t('pdf.videoLine1'), 104, {
    size: 11,
  })

  addSeal(pdf, 100)

  addCenteredText(pdf, t('pdf.videoScoreLine', { total: input.totalCount }), 174, {
    size: 18,
    bold: true,
    color: colors.primary,
  })

  setFillColor(pdf, [237, 247, 247])
  setDrawColor(pdf, colors.border)
  pdf.roundedRect(38, 201, 134, 24, 3, 3, 'FD')
  addCenteredText(pdf, t('pdf.generatedAt', { date: currentDate }), 211, {
    size: 10,
    bold: true,
  })

  addCenteredText(pdf, t('pdf.videoDisclaimer'), 260, {
    size: 8.5,
    color: colors.muted,
  })
}

export function generateVideoAttestationPdf(
  input: VideoAttestationInput,
  options: PdfOutputOptions = {},
): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  addVideoAttestationPage(pdf, input)
  outputPdf(pdf, 'attestation-formations-resilience-976.pdf', options)
}

export function generateAssessmentPdf(input: PdfInput, options: PdfOutputOptions = {}): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  addCertificatePage(pdf, input)

  pdf.addPage()
  addAnnexHeader(pdf)
  const { addTitle, addText, addChecklistItem } = createAnnexWriter(pdf)

  addTitle(t('pdf.domainScores'))
  for (const domain of input.result.domainScores) {
    addText(`${domain.label}: ${domain.score}/100`)
  }

  addTitle(t('pdf.immediatePriorities'))
  for (const [index, action] of input.immediateActions.entries()) {
    addText(`${index + 1}. ${action.title}`)
    addText(action.why, 20)
  }

  addTitle(t('pdf.weekActions'))
  for (const [index, action] of input.weekActions.entries()) {
    addText(`${index + 1}. ${action.title}`)
    addText(action.why, 20)
  }

  addTitle(t('pdf.checklist'))
  const checkedCount = Object.values(input.checklist).filter(Boolean).length
  addText(t('pdf.checkedCount', { count: checkedCount }))
  for (const item of input.checklistItems) {
    addChecklistItem(item)
  }

  addTitle(t('pdf.kit'))
  for (const item of input.kitItems) {
    addText(`- ${item.label}`)
  }

  addTitle(t('pdf.mainSources'))
  for (const source of input.sources.slice(0, 8)) {
    addText(`${source.label} - ${source.url}`)
  }

  addTitle(t('pdf.responsibility'))
  addText(t('pdf.responsibilityText'))

  outputPdf(pdf, 'certificat-resilience-976.pdf', options)
}

export function generateChecklistPdf(
  input: ChecklistPdfInput,
  options: PdfOutputOptions = {},
): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  addChecklistCoverPage(pdf, input)

  pdf.addPage()
  addAnnexHeader(pdf)
  const { addTitle, addText, addChecklistItem } = createAnnexWriter(pdf)

  addTitle(t('pdf.recommendedActions'))
  for (const item of input.recommendedItems) {
    addChecklistItem(item)
  }

  addTitle(t('pdf.customActions'))
  if (input.customItems.length === 0) {
    addText(t('pdf.noCustomAction'))
  }

  for (const item of input.customItems) {
    addChecklistItem(item)
  }

  addTitle(t('pdf.mention'))
  addText(t('pdf.checklistMention'))

  outputPdf(pdf, 'checklist-resilience-976.pdf', options)
}
