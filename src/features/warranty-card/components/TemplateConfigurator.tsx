import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ArrowLeft, Save, Loader2, Bold, Minus, Plus } from 'lucide-react'
import { getTemplateConfig, saveTemplateConfig } from '../services/templateConfig.service'
import { FIELD_LABELS, DEFAULT_FIELD_CONFIGS, FIELD_KEYS, CARD_W_PX, CARD_H_PX, type TemplateKey, type FieldConfig } from '../types/templateConfig.types'
import { CardFace } from './WarrantyCardPrintLayout'

interface TemplateConfiguratorProps {
  labId: string
  templateKey: TemplateKey
  templateUrl: string
  onBack: () => void
  cardData: {
    serialNo: number
    labDentist: string
    patientName: string
    toothNo: string
    regNo: string
    warranty: string
    validTill: string
    authorisedCode: string
    clinicName: string
    materialType: string
  }
}

const MIN_FONT = 5
const MAX_FONT = 40
const SCALE = 1.8

/** Clamp a value inside [0, max - margin] */
function clamp(val: number, max: number, margin = 20): number {
  return Math.max(0, Math.min(max - margin, val))
}

/** Ensure all saved field configs are within card boundaries */
function sanitizeConfigs(configs: Record<string, FieldConfig>): Record<string, FieldConfig> {
  const out: Record<string, FieldConfig> = {}
  for (const key of FIELD_KEYS) {
    const saved = configs[key]
    const def = DEFAULT_FIELD_CONFIGS[key]
    if (saved) {
      out[key] = {
        ...def,
        left: clamp(saved.left, CARD_W_PX),
        top: clamp(saved.top, CARD_H_PX),
        fontSize: saved.fontSize || def.fontSize,
        bold: saved.bold ?? def.bold,
        width: saved.width && saved.width > 0 ? saved.width : def.width,
      }
    } else {
      out[key] = { ...def }
    }
  }
  return out
}

export function TemplateConfigurator({ labId, templateKey, templateUrl, onBack, cardData }: TemplateConfiguratorProps) {
  const [fields, setFields] = useState<Record<string, FieldConfig>>(DEFAULT_FIELD_CONFIGS)
  const [selectedField, setSelectedField] = useState<string | null>(null)

  const visibleKeys = useMemo(() => {
    const isB = templateKey.startsWith('template_b')
    const isBack = templateKey.endsWith('back')
    if (isBack) return isB ? ['clinic_name', 'material_name'] : ['material_name']
    return isB
      ? FIELD_KEYS.filter((k) => k !== 'material_name')
      : FIELD_KEYS.filter((k) => k !== 'clinic_name' && k !== 'material_name')
  }, [templateKey])
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dragRef = useRef<{ field: string; startX: number; startY: number; origLeft: number; origTop: number } | null>(null)
  const resizeRef = useRef<{ field: string; startX: number; origWidth: number } | null>(null)

  useEffect(() => {
    getTemplateConfig(labId, templateKey).then((config) => {
      const sanitized = sanitizeConfigs(config)
      setFields(sanitized)
      setSelectedField(visibleKeys[0] || null)
    })
  }, [labId, templateKey])

  const handleMouseDown = useCallback((field: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const cfg = fields[field]
    dragRef.current = { field, startX: e.clientX, startY: e.clientY, origLeft: cfg.left, origTop: cfg.top }
    setSelectedField(field)

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (ev.clientX - d.startX) / SCALE
      const dy = (ev.clientY - d.startY) / SCALE
      setFields((prev) => ({
        ...prev,
        [d.field]: {
          ...prev[d.field],
          left: clamp(d.origLeft + dx, CARD_W_PX),
          top: clamp(d.origTop + dy, CARD_H_PX, 0),
        },
      }))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [fields])

  const handleResizeDown = useCallback((field: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const cfg = fields[field]
    resizeRef.current = { field, startX: e.clientX, origWidth: cfg.width || 80 }

    const onMove = (ev: MouseEvent) => {
      const r = resizeRef.current
      if (!r) return
      const dw = (ev.clientX - r.startX) / SCALE
      setFields((prev) => ({
        ...prev,
        [r.field]: {
          ...prev[r.field],
          width: Math.max(20, r.origWidth + dw),
        },
      }))
    }
    const onUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [fields])

  const changeFontSize = useCallback((field: string, delta: number) => {
    setFields((prev) => {
      const cfg = prev[field]
      if (!cfg) return prev
      return { ...prev, [field]: { ...cfg, fontSize: Math.max(MIN_FONT, Math.min(MAX_FONT, cfg.fontSize + delta)) } }
    })
  }, [])

  const toggleBold = useCallback((field: string) => {
    setFields((prev) => {
      const cfg = prev[field]
      if (!cfg) return prev
      return { ...prev, [field]: { ...cfg, bold: !cfg.bold } }
    })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveTemplateConfig(labId, templateKey, fields)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save config:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 className="text-white font-semibold">Configure: {templateKey}</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'center center' }}>
            <div style={{ position: 'relative', width: `${CARD_W_PX}px`, height: `${CARD_H_PX}px`, background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <CardFace
                templateUrl={templateUrl}
                cardData={cardData}
                fieldConfigs={fields}
                visibleFieldKeys={visibleKeys}
                isBack={templateKey.endsWith('back')}
                isCustomBack={templateKey.startsWith('template_b')}
                clinicName={cardData.clinicName}
              />
              <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                {visibleKeys.map((key) => {
                  const cfg = fields[key]
                  return (
                    <div key={key} style={{ position: 'absolute', left: cfg.left, top: cfg.top }}>
                      <div
                        onMouseDown={(e) => handleMouseDown(key, e)}
                        style={{
                          width: (cfg.width || 80),
                          height: cfg.fontSize + 4,
                          cursor: 'move',
                          background: selectedField === key ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                          border: selectedField === key ? '1px dashed rgba(139, 92, 246, 0.5)' : '1px solid transparent',
                          borderRadius: '2px',
                          position: 'relative',
                        }}
                      >
                        {selectedField === key && (
                          <div
                            onMouseDown={(e) => handleResizeDown(key, e)}
                            style={{
                              position: 'absolute',
                              right: -4,
                              bottom: -4,
                              width: 8,
                              height: 8,
                              background: '#8b5cf6',
                              borderRadius: 1,
                              cursor: 'se-resize',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {selectedField && fields[selectedField] && (
          <div className="w-72 border-l border-slate-800 bg-slate-900 p-5 overflow-y-auto space-y-5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              {FIELD_LABELS[selectedField] || selectedField}
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-2">Font Size</label>
              <div className="flex items-center gap-3">
                <button onClick={() => changeFontSize(selectedField, -1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                  <Minus size={14} />
                </button>
                <span className="text-white font-mono text-sm w-8 text-center">{fields[selectedField].fontSize}</span>
                <button onClick={() => changeFontSize(selectedField, 1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">Style</label>
              <button
                onClick={() => toggleBold(selectedField)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  fields[selectedField].bold
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Bold size={14} />
                Bold
              </button>
            </div>

            <div className="pt-2 text-xs text-slate-500 space-y-1">
              <p>Drag field to move.</p>
              <p>Drag resize handle (bottom-right) to resize.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
