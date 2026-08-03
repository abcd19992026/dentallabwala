import { useEffect, useState, useMemo, useCallback } from 'react'
import { Plus, Search, Printer, FileDown, FileText, Settings, Pencil } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { supabase } from '@/lib/supabase/client'
import { getWarrantyCards, createWarrantyCard, updateWarrantyCard } from '@/features/warranty-card/services/warrantyCard.service'
import { GenerateCardModal } from '@/features/warranty-card/components/GenerateCardModal'
import { GenerateFlowModal } from '@/features/warranty-card/components/GenerateFlowModal'

import { WarrantyCardPrintLayout } from '@/features/warranty-card/components/WarrantyCardPrintLayout'
import { downloadWarrantyCardPDF } from '@/features/warranty-card/utils/pdfExport'
import { TemplateSelectModal } from '@/features/warranty-card/components/TemplateSelectModal'
import { TemplateConfigurator } from '@/features/warranty-card/components/TemplateConfigurator'
import { BulkPrintModal } from '@/features/warranty-card/components/BulkPrintModal'
import { BulkPrintLayout, type BulkPrintCardData } from '@/features/warranty-card/components/BulkPrintLayout'
import { getTemplateConfig } from '@/features/warranty-card/services/templateConfig.service'
import type { WarrantyCard, WarrantyCardFormData } from '@/features/warranty-card/types/warrantyCard.types'
import type { TemplateKey } from '@/features/warranty-card/types/templateConfig.types'
import type { FieldConfig } from '@/features/warranty-card/types/templateConfig.types'

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}.${m}.${y.slice(-2)}`
  }
  return dateStr
}

export default function WarrantyCardPage() {
  const { labId } = useAuthStore()
  const { tenant } = useTenantStore()
  const effectiveLabId = labId || tenant?.id || ''

  const [cards, setCards] = useState<WarrantyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Generate flow state
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [generationType, setGenerationType] = useState<'main' | 'custom'>('main')
  const [editingCard, setEditingCard] = useState<WarrantyCard | null>(null)

  // Bulk Print state
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)

  // Print / PDF state (no longer uses popup — determined from saved card data)

  // Template Configurator state
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false)
  const [configCard, setConfigCard] = useState<WarrantyCard | null>(null)
  const [configTemplateKey, setConfigTemplateKey] = useState<TemplateKey | null>(null)
  const [configTemplateUrl, setConfigTemplateUrl] = useState('')

  const loadCards = useCallback(async () => {
    if (!effectiveLabId) return
    setLoading(true)
    try {
      const data = await getWarrantyCards(effectiveLabId)
      setCards(data)
    } catch (err) {
      console.error('Failed to load warranty cards:', err)
    } finally {
      setLoading(false)
    }
  }, [effectiveLabId])

  useEffect(() => { loadCards() }, [loadCards])

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards
    const q = searchQuery.toLowerCase()
    return cards.filter(
      (c) =>
        c.patient_name?.toLowerCase().includes(q) ||
        c.lab_dentist?.toLowerCase().includes(q) ||
        c.tooth_no?.toLowerCase().includes(q)
    )
  }, [cards, searchQuery])

  const handleFlowSelect = (type: 'main' | 'custom') => {
    setGenerationType(type)
    setEditingCard(null)
    setIsFlowModalOpen(false)
    setIsGenerateOpen(true)
  }

  const handleEditCard = (card: WarrantyCard) => {
    setEditingCard(card)
    setGenerationType(card.clinic_name ? 'custom' : 'main')
    setIsGenerateOpen(true)
  }

  const handleSaveCard = async (formData: WarrantyCardFormData, cardId?: string) => {
    if (!effectiveLabId) {
      throw new Error('Lab ID is missing. Make sure you are logged in to a valid lab account.')
    }
    if (cardId) {
      await updateWarrantyCard(effectiveLabId, cardId, formData)
    } else {
      await createWarrantyCard(effectiveLabId, formData)
    }
    await loadCards()
  }
  const waitForImages = (element: HTMLElement): Promise<void> => {
    const imgs = Array.from(element.querySelectorAll('img'))
    if (imgs.length === 0) return Promise.resolve()
    return Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) { resolve(); return }
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
      )
    ).then(() => undefined)
  }

  const handlePrintOrDownload = async (
    card: WarrantyCard,
    action: 'print' | 'pdf',
    mode: 'main' | 'custom',
    clinicName?: string,
  ) => {
    const serialNo = card.sl_no

    // Fetch lab details
    const { data: labData } = await supabase
      .from('labs')
      .select('lab_name, address')
      .eq('id', effectiveLabId)
      .single()

    // Fetch storage paths from warranty_templates table
    const { data: templateData, error: templateError } = await supabase
      .from('warranty_templates')
      .select('template_a_front, template_a_back, template_b_front, template_b_back')
      .eq('lab_id', effectiveLabId)
      .single()

    if (templateError || !templateData) {
      throw new Error('Template not found. Please contact Super Admin.')
    }

    const frontPath =
      mode === 'main'
        ? templateData.template_a_front
        : templateData.template_b_front

    const backPath =
      mode === 'main'
        ? templateData.template_a_back
        : templateData.template_b_back

    // Generate signed URLs for the private storage bucket
    const generateSigned = async (path: string | null) => {
      console.log("Storage Path:", path);

      if (!path) return '';

      const { data, error } = await supabase.storage
        .from('template')
        .createSignedUrl(path, 3600);

      console.log("Signed URL:", data?.signedUrl);
      console.log("Signed URL Error:", error);

      return data?.signedUrl || '';
    }

    const frontUrl = await generateSigned(frontPath)
    const backUrl = await generateSigned(backPath)

    // Fetch saved field configuration for this template
    const templateKey: TemplateKey = mode === 'main' ? 'template_a_front' : 'template_b_front'
    const fieldConfigs = await getTemplateConfig(effectiveLabId, templateKey)
    const backKey: TemplateKey = mode === 'main' ? 'template_a_back' : 'template_b_back'
    const backFieldConfigs = mode === 'custom'
      ? await getTemplateConfig(effectiveLabId, backKey)
      : undefined

    if (action === 'print') {
      // --- PRINT: Open a new window with only the card ---
      const printWindow = window.open('', '_blank', 'width=500,height=400')
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Build the full HTML document with ATM-card print CSS
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Warranty Card</title>
          <style>
            @page { size: 85.6mm 53.98mm; margin: 0; }
            html, body {
              width: 85.6mm;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
        </html>
      `)
      printWindow.document.close()

      // Wait for the window document to be ready
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Render the print layout into the new window
      const { createRoot } = await import('react-dom/client')
      const rootEl = printWindow.document.getElementById('print-root')!
      const reactRoot = createRoot(rootEl)
      reactRoot.render(
        <WarrantyCardPrintLayout
          mode={mode}
          clinicName={clinicName}
          cardData={{
            serialNo,
            labDentist: card.lab_dentist || '',
            patientName: card.patient_name || '',
            toothNo: card.tooth_no || '',
            regNo: card.reg_no || '',
            warranty: card.warranty || '',
            validTill: card.valid_till || '',
            authorisedCode: card.authorised_code || '',
            clinicName: clinicName || '',
          }}
          labDetails={{
            labName: labData?.lab_name || tenant?.name || '',
            address: labData?.address || '',
          }}
          templates={{
            frontUrl: frontUrl || '',
            backUrl: backUrl || '',
          }}
          fieldConfigs={fieldConfigs}
          backFieldConfigs={backFieldConfigs}
        />
      )

      // Wait for React to render and images to load
      await new Promise((resolve) => setTimeout(resolve, 500))
      await waitForImages(rootEl)

      // Print and auto-close
      printWindow.onafterprint = () => {
        reactRoot.unmount()
        printWindow.close()
      }
      printWindow.print()

      // Fallback close if onafterprint didn't fire
      setTimeout(() => {
        try {
          if (!printWindow.closed) {
            reactRoot.unmount()
            printWindow.close()
          }
        } catch { }
      }, 5000)

      return
    }

    // --- PDF: Render into off-screen div and generate PDF ---
    const container = document.createElement('div')
    container.id = 'warranty-card-print-container'
    container.style.position = 'fixed'
    container.style.left = '0'
    container.style.top = '0'
    container.style.width = '0'
    container.style.height = '0'
    container.style.overflow = 'visible'
    container.style.zIndex = '-1'
    document.body.appendChild(container)

    const printEl = document.createElement('div')
    printEl.id = 'warranty-card-print-root'
    container.appendChild(printEl)

    const { createRoot } = await import('react-dom/client')
    const reactRoot = createRoot(printEl)
    reactRoot.render(
      <WarrantyCardPrintLayout
        mode={mode}
        clinicName={clinicName}
        cardData={{
          serialNo,
          labDentist: card.lab_dentist || '',
          patientName: card.patient_name || '',
          toothNo: card.tooth_no || '',
          regNo: card.reg_no || '',
          warranty: card.warranty || '',
          validTill: card.valid_till || '',
          authorisedCode: card.authorised_code || '',
          clinicName: clinicName || '',
        }}
        labDetails={{
          labName: labData?.lab_name || tenant?.name || '',
          address: labData?.address || '',
        }}
        templates={{
          frontUrl: frontUrl || '',
          backUrl: backUrl || '',
        }}
        fieldConfigs={fieldConfigs}
        backFieldConfigs={backFieldConfigs}
      />
    )

    await new Promise((resolve) => setTimeout(resolve, 2000))

    try {
      await downloadWarrantyCardPDF('warranty-card-print-root', `Warranty_Card_${serialNo}.pdf`)
    } finally {
      reactRoot.unmount()
      document.body.removeChild(container)
    }
  }

  const getMode = (card: WarrantyCard): { mode: 'main' | 'custom'; clinicName?: string } => {
    if (card.clinic_name) return { mode: 'custom', clinicName: card.clinic_name }
    return { mode: 'main' }
  }

  const handlePrintAction = (card: WarrantyCard) => {
    const { mode, clinicName } = getMode(card)
    handlePrintOrDownload(card, 'print', mode, clinicName).catch(console.error)
  }

  const handleDownloadAction = (card: WarrantyCard) => {
    const { mode, clinicName } = getMode(card)
    handlePrintOrDownload(card, 'pdf', mode, clinicName).catch(console.error)
  }

  const generateSigned = async (path: string | null) => {
    if (!path) return ''
    const { data } = await supabase.storage
      .from('template')
      .createSignedUrl(path, 3600)
    return data?.signedUrl || ''
  }

  const handleBulkPrint = async (from: number, to: number) => {
    setIsBulkPrintOpen(false)
    setIsPreparing(true)
    try {
      // Fetch templates
      const { data: templateData, error: templateError } = await supabase
        .from('warranty_templates')
        .select('template_a_front, template_a_back, template_b_front, template_b_back')
        .eq('lab_id', effectiveLabId)
        .single()

      if (templateError || !templateData) {
        throw new Error('Template not found. Please contact Super Admin.')
      }

      // Cards in the selected serial range, sorted ascending
      const rangeCards = cards
        .filter((c) => c.sl_no >= from && c.sl_no <= to)
        .sort((a, b) => a.sl_no - b.sl_no)

      if (rangeCards.length === 0) {
        throw new Error('No warranty cards found in the selected serial range.')
      }

      // Build print data for each card using its own saved template mode
      const printCards: BulkPrintCardData[] = []
      for (const card of rangeCards) {
        const { mode, clinicName } = getMode(card)

        const frontPath = mode === 'main'
          ? templateData.template_a_front
          : templateData.template_b_front
        const backPath = mode === 'main'
          ? templateData.template_a_back
          : templateData.template_b_back

        const [frontUrl, backUrl] = await Promise.all([
          generateSigned(frontPath),
          generateSigned(backPath),
        ])

        const templateKey: TemplateKey = mode === 'main' ? 'template_a_front' : 'template_b_front'
        const fieldConfigs: Record<string, FieldConfig> = await getTemplateConfig(effectiveLabId, templateKey)
        const backKey: TemplateKey = mode === 'main' ? 'template_a_back' : 'template_b_back'
        const backFieldConfigs = mode === 'custom'
          ? await getTemplateConfig(effectiveLabId, backKey)
          : undefined

        printCards.push({
          cardData: {
            serialNo: card.sl_no,
            labDentist: card.lab_dentist || '',
            patientName: card.patient_name || '',
            toothNo: card.tooth_no || '',
            regNo: card.reg_no || '',
            warranty: card.warranty || '',
            validTill: card.valid_till || '',
            authorisedCode: card.authorised_code || '',
            clinicName: clinicName || '',
          },
          mode,
          clinicName,
          templates: { frontUrl, backUrl },
          fieldConfigs,
          backFieldConfigs,
        })
      }

      // Open print window and render the A4 bulk layout
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bulk Warranty Cards</title>
          <style>
            @page { size: A4 portrait; margin: 5mm; }
            html, body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              width: 210mm;
            }
          </style>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
        </html>
      `)
      printWindow.document.close()
      await new Promise((resolve) => setTimeout(resolve, 100))

      const { createRoot } = await import('react-dom/client')
      const rootEl = printWindow.document.getElementById('print-root')!
      const reactRoot = createRoot(rootEl)
      reactRoot.render(<BulkPrintLayout cards={printCards} />)

      await new Promise((resolve) => setTimeout(resolve, 800))
      await waitForImages(rootEl)

      printWindow.onafterprint = () => {
        reactRoot.unmount()
        printWindow.close()
      }
      printWindow.print()

      setTimeout(() => {
        try {
          if (!printWindow.closed) {
            reactRoot.unmount()
            printWindow.close()
          }
        } catch { }
      }, 8000)
    } catch (err) {
      console.error('Bulk print failed:', err)
      alert(err instanceof Error ? err.message : 'Bulk print failed.')
    } finally {
      setIsPreparing(false)
    }
  }

  const openConfigure = async (card: WarrantyCard) => {
    setConfigCard(card)
    setIsTemplateSelectOpen(true)
  }

  const handleTemplateSelect = async (templateKey: TemplateKey) => {
    setIsTemplateSelectOpen(false)
    // Fetch the template URL from warranty_templates
    const { data: templateData } = await supabase
      .from('warranty_templates')
      .select('*')
      .eq('lab_id', effectiveLabId)
      .single()

    const record = templateData as Record<string, string | null> | null
    const path = record?.[templateKey]
    if (!path) {
      alert('Template not found. Please contact Super Admin.')
      return
    }

    // Generate signed URL
    const { data: signedData } = await supabase.storage
      .from('template')
      .createSignedUrl(path, 3600)

    setConfigTemplateKey(templateKey)
    setConfigTemplateUrl(signedData?.signedUrl || '')
  }

  const handleConfiguratorBack = () => {
    setConfigTemplateKey(null)
    setConfigTemplateUrl('')
    setConfigCard(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Warranty Card</h1>
          <p className="text-slate-400 text-sm mt-1">Issue and manage dental warranty cards</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBulkPrintOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
          >
            <Printer size={16} />
            Bulk Print
          </button>
          <button
            onClick={() => setIsFlowModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-600/25"
          >
            <Plus size={16} />
            Generate Warranty Card
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by patient, doctor, or tooth..."
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">Loading warranty cards...</div>
        ) : filteredCards.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileText size={40} className="text-slate-700 mx-auto" />
            <p className="text-slate-400 font-medium">No Warranty Cards Found</p>
            <p className="text-xs text-slate-600">Click &quot;Generate Warranty Card&quot; to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4 w-16">SL No.</th>
                  <th className="px-5 py-4">Patient Name</th>
                  <th className="px-5 py-4">Doctor / Lab</th>
                  <th className="px-5 py-4">Issue Date</th>
                  <th className="px-5 py-4">Valid Till</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-slate-400">#{card.sl_no}</td>
                    <td className="px-5 py-4 font-medium text-white">{card.patient_name || '-'}</td>
                    <td className="px-5 py-4">{card.lab_dentist || '-'}</td>
                    <td className="px-5 py-4">{formatDate(card.issue_date)}</td>
                    <td className="px-5 py-4">{formatDate(card.valid_till)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditCard(card)}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                            title="Edit Warranty Card"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handlePrintAction(card)}
                            className="p-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 transition-colors"
                            title="Print"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            onClick={() => openConfigure(card)}
                            className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors"
                            title="Configure Template"
                          >
                            <Settings size={15} />
                          </button>
                          <button
                            onClick={() => handleDownloadAction(card)}
                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                            title="Download PDF"
                          >
                            <FileDown size={15} />
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Print Modal */}
      <BulkPrintModal
        isOpen={isBulkPrintOpen}
        onClose={() => setIsBulkPrintOpen(false)}
        onPrint={handleBulkPrint}
      />

      {/* Bulk Print Loading Overlay */}
      {isPreparing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-8 py-6 shadow-2xl">
            <p className="text-white font-medium">Preparing Print Layout...</p>
          </div>
        </div>
      )}

      {/* Generate Flow Modal */}
      <GenerateFlowModal
        isOpen={isFlowModalOpen}
        onClose={() => setIsFlowModalOpen(false)}
        onSelect={handleFlowSelect}
      />

      {/* Generate / Edit Card Modal */}
      <GenerateCardModal
        isOpen={isGenerateOpen}
        onClose={() => {
          setIsGenerateOpen(false)
          setEditingCard(null)
        }}
        onSave={handleSaveCard}
        generationType={generationType}
        editingCard={editingCard}
      />

      {/* Template Select Modal */}
      {configCard && (
        <TemplateSelectModal
          isOpen={isTemplateSelectOpen}
          onClose={() => setIsTemplateSelectOpen(false)}
          onSelect={handleTemplateSelect}
          generationType={configCard.clinic_name ? 'custom' : 'main'}
        />
      )}

      {/* Template Configurator */}
      {configTemplateKey && configTemplateUrl && configCard && (
        <TemplateConfigurator
          labId={effectiveLabId}
          templateKey={configTemplateKey}
          templateUrl={configTemplateUrl}
          onBack={handleConfiguratorBack}
          cardData={{
            serialNo: configCard.sl_no,
            labDentist: configCard.lab_dentist || '',
            patientName: configCard.patient_name || '',
            toothNo: configCard.tooth_no || '',
            regNo: configCard.reg_no || '',
            warranty: configCard.warranty || '',
            validTill: configCard.valid_till || '',
            authorisedCode: configCard.authorised_code || '',
            clinicName: configCard.clinic_name || '',
          }}
        />
      )}
    </div>
  )
}
