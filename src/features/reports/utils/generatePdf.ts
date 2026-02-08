import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Case } from '@/types'

interface BankReportData {
  bankName: string
  bankLogoUrl: string | null
  generatedAt: Date
  cases: Case[]
  stats: {
    totalCases: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    totalAmount: number
    totalPrincipal: number
    totalInterest: number
    totalPenalties: number
    totalFees: number
    totalPaid: number
    totalRemainingBalance: number
  }
}

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  assigned: 'Affecte',
  in_progress: 'En cours',
  promise: 'Promesse',
  partial_payment: 'Paiement partiel',
  paid: 'Paye',
  closed: 'Cloture',
}

// Couleurs de la marque Altis Services
const NAVY: [number, number, number] = [0, 51, 102] // #003366
const SILVER: [number, number, number] = [139, 154, 168] // #8B9AA8
const WHITE: [number, number, number] = [255, 255, 255]
const DARK: [number, number, number] = [33, 37, 41]
const LIGHT_BG: [number, number, number] = [240, 243, 247]
const RED: [number, number, number] = [180, 30, 30]
const GREEN: [number, number, number] = [34, 120, 60]

const formatAmount = (amount: number): string => {
  const num = Math.round(amount)
  const parts: string[] = []
  let remaining = num

  if (remaining === 0) return '0 MRU'

  while (remaining > 0) {
    const part = remaining % 1000
    remaining = Math.floor(remaining / 1000)
    if (remaining > 0) {
      parts.unshift(part.toString().padStart(3, '0'))
    } else {
      parts.unshift(part.toString())
    }
  }

  return parts.join('.') + ' MRU'
}

const formatDatePdf = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear()
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${d}/${m}/${y} ${h}:${min}`
}

async function loadImageBase64(url: string, removeWhiteBg = false): Promise<string | null> {
  try {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }

        ctx.drawImage(img, 0, 0)

        if (removeWhiteBg) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const pixels = imageData.data
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] > 230 && pixels[i + 1] > 230 && pixels[i + 2] > 230) {
              pixels[i + 3] = 0
            }
          }
          ctx.putImageData(imageData, 0, 0)
        }

        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  } catch {
    return null
  }
}

async function loadAltisLogo(): Promise<string | null> {
  return loadImageBase64('/logo.jpeg', true)
}

function drawHeader(
  doc: jsPDF,
  pageWidth: number,
  logoBase64: string | null,
  bankLogoBase64: string | null,
  data: BankReportData,
) {
  const headerHeight = 40

  // Fond navy
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2])
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  // Bande accent silver en bas du header
  doc.setFillColor(SILVER[0], SILVER[1], SILVER[2])
  doc.rect(0, headerHeight, pageWidth, 1.5, 'F')

  // Logo Altis dans un cadre blanc arrondi
  let textStartX = 14
  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(8, 4, 32, 32, 3, 3, 'F')
      doc.addImage(logoBase64, 'PNG', 9, 5, 30, 30)
      textStartX = 45
    } catch {
      // Fallback sans logo
    }
  }

  // Zone de droite pour le logo banque
  const rightLimit = bankLogoBase64 ? pageWidth - 50 : pageWidth - 14

  // Logo de la banque a droite
  if (bankLogoBase64) {
    try {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(pageWidth - 42, 4, 32, 32, 3, 3, 'F')
      doc.addImage(bankLogoBase64, 'PNG', pageWidth - 41, 5, 30, 30)
    } catch {
      // Fallback sans logo banque
    }
  }

  // Titre
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('ALTIS SERVICES', textStartX, 16)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 215, 230)
  doc.text('Rapport de Recouvrement', textStartX, 24)

  // Banque et date en bas du header
  doc.setFontSize(9)
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
  doc.text(`Banque: ${data.bankName}`, textStartX, 34)
  doc.text(`Genere le: ${formatDatePdf(data.generatedAt)}`, rightLimit, 34, { align: 'right' })
}

function drawFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number) {
  const y = pageHeight - 12

  // Ligne de separation
  doc.setDrawColor(SILVER[0], SILVER[1], SILVER[2])
  doc.setLineWidth(0.5)
  doc.line(14, y - 3, pageWidth - 14, y - 3)

  doc.setFontSize(7)
  doc.setTextColor(SILVER[0], SILVER[1], SILVER[2])
  doc.text('Altis Services - Document confidentiel', 14, y)
  doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - 14, y, { align: 'right' })
}

function drawSummaryBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  options?: { highlight?: 'red' | 'green' | 'navy' }
) {
  // Fond de la boite
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2])
  doc.roundedRect(x, y, w, h, 2, 2, 'F')

  // Bordure gauche coloree
  const borderColor = options?.highlight === 'red' ? RED
    : options?.highlight === 'green' ? GREEN
    : NAVY
  doc.setFillColor(borderColor[0], borderColor[1], borderColor[2])
  doc.rect(x, y + 2, 2, h - 4, 'F')

  // Label
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(SILVER[0], SILVER[1], SILVER[2])
  doc.text(label, x + 6, y + 7)

  // Valeur
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  if (options?.highlight === 'red') {
    doc.setTextColor(RED[0], RED[1], RED[2])
  } else if (options?.highlight === 'green') {
    doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
  } else {
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2])
  }
  doc.text(value, x + 6, y + 15)
}

export async function generateBankReportPdf(data: BankReportData): Promise<void> {
  const doc = new jsPDF('l', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Charger les logos en parallele
  const [altisLogo, bankLogo] = await Promise.all([
    loadAltisLogo(),
    data.bankLogoUrl ? loadImageBase64(data.bankLogoUrl, true) : Promise.resolve(null),
  ])

  // ==================== PAGE 1 : EN-TETE + RESUME + TABLEAU FINANCIER ====================
  drawHeader(doc, pageWidth, altisLogo, bankLogo, data)

  let yPos = 48

  // Section Resume - titre avec ligne
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2])
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Resume', 14, yPos)
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2])
  doc.setLineWidth(0.8)
  doc.line(14, yPos + 2, 50, yPos + 2)
  yPos += 8

  // Boites de stats - ligne 1
  const boxWidth = (pageWidth - 28 - 25) / 6 // 6 boxes avec espaces
  const boxHeight = 20
  const gap = 5

  drawSummaryBox(doc, 14, yPos, boxWidth, boxHeight, 'Total dossiers', String(data.stats.totalCases))
  drawSummaryBox(doc, 14 + (boxWidth + gap), yPos, boxWidth, boxHeight, 'Montant total', formatAmount(data.stats.totalAmount), { highlight: 'navy' })
  drawSummaryBox(doc, 14 + (boxWidth + gap) * 2, yPos, boxWidth, boxHeight, 'Principal', formatAmount(data.stats.totalPrincipal))
  drawSummaryBox(doc, 14 + (boxWidth + gap) * 3, yPos, boxWidth, boxHeight, 'Interets', formatAmount(data.stats.totalInterest))
  drawSummaryBox(doc, 14 + (boxWidth + gap) * 4, yPos, boxWidth, boxHeight, 'Total paye', formatAmount(data.stats.totalPaid), { highlight: 'green' })
  drawSummaryBox(doc, 14 + (boxWidth + gap) * 5, yPos, boxWidth, boxHeight, 'Solde restant', formatAmount(data.stats.totalRemainingBalance), { highlight: 'red' })

  yPos += boxHeight + 10

  // Titre du tableau
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2])
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Liste detaillee des dossiers', 14, yPos)
  doc.setLineWidth(0.8)
  doc.line(14, yPos + 2, 80, yPos + 2)
  yPos += 8

  // Donnees du tableau financier
  const casesData = data.cases.map((c) => {
    const isPM = c.debtor_pm !== null
    const debtorName = c.debtor_pp
      ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}`
      : c.debtor_pm?.company_name || '-'

    const phone = isPM
      ? c.debtor_pm?.phone_primary || '-'
      : c.debtor_pp?.phone_primary || '-'

    const email = isPM
      ? c.debtor_pm?.email || '-'
      : c.debtor_pp?.email || '-'

    const rc = isPM ? c.debtor_pm?.rc_number || '-' : '-'

    const principal = c.amount_principal || 0
    const interest = c.amount_interest || 0
    const penalties = c.amount_penalties || 0
    const fees = c.amount_fees || 0
    const total = principal + interest + penalties + fees
    const remaining = total

    return [
      c.reference || '-',
      isPM ? 'PM' : 'PP',
      debtorName,
      rc,
      phone,
      email,
      formatAmount(principal),
      formatAmount(interest),
      formatAmount(penalties),
      formatAmount(fees),
      formatAmount(total),
      formatAmount(remaining),
      statusLabels[c.status] || c.status,
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [[
      'Ref.',
      'Type',
      'Debiteur',
      'RC/NIF',
      'Telephone',
      'Email',
      'Principal',
      'Interets',
      'Penalites',
      'Frais',
      'Total',
      'Solde restant',
      'Statut',
    ]],
    body: casesData,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 6.5,
      cellPadding: 2,
      textColor: DARK,
      lineColor: [220, 225, 230],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 6.5,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 10 },
      2: { cellWidth: 35 },
      3: { cellWidth: 22 },
      4: { cellWidth: 24 },
      5: { cellWidth: 32 },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' },
      10: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      11: { cellWidth: 24, halign: 'right', textColor: RED },
      12: { cellWidth: 18 },
    },
  })

  // ==================== PAGE 2 : DETAILS CONTACTS ====================
  doc.addPage('l')
  drawHeader(doc, pageWidth, altisLogo, bankLogo, data)

  yPos = 48

  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2])
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Details des contacts et adresses', 14, yPos)
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2])
  doc.setLineWidth(0.8)
  doc.line(14, yPos + 2, 90, yPos + 2)
  yPos += 8

  const contactsData = data.cases.map((c) => {
    const isPM = c.debtor_pm !== null
    const debtorName = c.debtor_pp
      ? `${c.debtor_pp.first_name} ${c.debtor_pp.last_name}`
      : c.debtor_pm?.company_name || '-'

    const phone = isPM
      ? c.debtor_pm?.phone_primary || '-'
      : c.debtor_pp?.phone_primary || '-'

    const email = isPM
      ? c.debtor_pm?.email || '-'
      : c.debtor_pp?.email || '-'

    const street = isPM
      ? c.debtor_pm?.address_street || '-'
      : c.debtor_pp?.address_street || '-'

    const city = isPM
      ? c.debtor_pm?.address_city || '-'
      : c.debtor_pp?.address_city || '-'

    return [
      c.reference || '-',
      debtorName,
      phone,
      email,
      street,
      city,
      c.contract_reference || '-',
      c.default_date || '-',
    ]
  })

  autoTable(doc, {
    startY: yPos,
    head: [[
      'Reference',
      'Debiteur',
      'Telephone',
      'Email',
      'Adresse',
      'Ville',
      'Ref. Contrat',
      'Date defaut',
    ]],
    body: contactsData,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: DARK,
      lineColor: [220, 225, 230],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 45 },
      2: { cellWidth: 32 },
      3: { cellWidth: 45 },
      4: { cellWidth: 50 },
      5: { cellWidth: 35 },
      6: { cellWidth: 28 },
      7: { cellWidth: 25 },
    },
  })

  // ==================== PIEDS DE PAGE ====================
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    drawFooter(doc, pageWidth, pageHeight, i, pageCount)
  }

  // Telecharger le PDF
  const fileName = `rapport_${data.bankName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
