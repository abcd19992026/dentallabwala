import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ArrowLeft, Save, Loader2, Bold, Minus, Plus } from 'lucide-react'
import { getTemplateConfig, saveTemplateConfig } from '../services/templateConfig.service'
import { FIELD_LABELS, DEFAULT_FIELD_CONFIGS, FIELD_KEYS, CARD_W_PX, CARD_H_PX, materialTextVariantKey, taglineVariantKey, type TemplateKey, type FieldConfig } from '../types/templateConfig.types'
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

/** Only these two fields use their RIGHT edge as the anchor */
function isRightAnchored(field: string): boolean {
  return field === 'material_text' || field === 'tagline'
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

  // Preserve extra keys that are not part of FIELD_KEYS (e.g. material_text_dmls,
  // tagline_pfm, tagline_zirconia). Sanitize them the same way so their saved
  // positions survive loading instead of being discarded.
  for (const [key, saved] of Object.entries(configs)) {
    if (!saved || out[key]) continue
    out[key] = {
      left: clamp(saved.left ?? 0, CARD_W_PX),
      top: clamp(saved.top ?? 0, CARD_H_PX),
      fontSize: saved.fontSize || 8,
      bold: saved.bold ?? false,
      width: saved.width && saved.width > 0 ? saved.width : 80,
    }
  }

  return out
}

export function TemplateConfigurator({ labId, templateKey, templateUrl, onBack, cardData }: TemplateConfiguratorProps) {
  const [fields, setFields] = useState<Record<string, FieldConfig>>(DEFAULT_FIELD_CONFIGS)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  // Automatically detect the material from the card being configured.
  const selectedMaterial = cardData.materialType || 'Zirconia'
  console.log('Configure Material:', cardData.materialType)

  // Resolve the storage key edited for a field. material_text and tagline use
  // their material-specific key (e.g. material_text_dmls), all others use the field itself.
  const fieldEditKey = (field: string): string => {
    if (field === 'material_text') return materialTextVariantKey(selectedMaterial)
    if (field === 'tagline') return taglineVariantKey(selectedMaterial)
    return field
  }

  // Resolve the current config for a field, preferring the material-specific key.
  const resolveFieldCfg = (field: string): FieldConfig => {
    if (field === 'material_text') return fields[materialTextVariantKey(selectedMaterial)] ?? fields['material_text']
    if (field === 'tagline') return fields[taglineVariantKey(selectedMaterial)] ?? fields['tagline']
    return fields[field]
  }

  const visibleKeys = useMemo(() => {
    const isB = templateKey.startsWith('template_b')
    const isBack = templateKey.endsWith('back')
    if (isBack) return isB ? ['clinic_name', 'material_name'] : ['material_name']
    return isB
      ? FIELD_KEYS.filter((k) => k !== 'material_name')
      : FIELD_KEYS.filter((k) => k !== 'clinic_name' && k !== 'material_name')
  }, [templateKey])
  const isFront = templateKey.endsWith('front')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dragRef = useRef<{ field: string; startX: number; startY: number; origLeft: number; origTop: number } | null>(null)
  const resizeRef = useRef<{ field: string; startX: number; origLeft: number; origWidth: number } | null>(null)
  const originalMaterialTextRef = useRef<FieldConfig | null>(null)
  const originalTaglineRef = useRef<FieldConfig | null>(null)

  useEffect(() => {
    getTemplateConfig(labId, templateKey).then((config) => {
      const sanitized = sanitizeConfigs(config)
      originalMaterialTextRef.current = sanitized['material_text']
        ? { ...sanitized['material_text'] }
        : null
      originalTaglineRef.current = sanitized['tagline']
        ? { ...sanitized['tagline'] }
        : null
      // Load the Material Text & Tagline positions for the currently selected material.
      // First look for the material-specific keys (material_text_<material>,
      // tagline_<material>) inside config.fields. If present, load them into
      // fields.material_text / fields.tagline. Otherwise fall back to the
      // default (or previously saved generic) configuration.
      if (isFront) {
        const mtVariantKey = materialTextVariantKey(selectedMaterial)
        const tgVariantKey = taglineVariantKey(selectedMaterial)

        const mtVariant = config[mtVariantKey]
        const mtDefault = sanitized['material_text'] || { ...DEFAULT_FIELD_CONFIGS['material_text'] }
        sanitized['material_text'] = mtVariant
          ? { ...mtDefault, left: clamp(mtVariant.left, CARD_W_PX), top: clamp(mtVariant.top, CARD_H_PX, 0) }
          : { ...mtDefault }

        const tgVariant = config[tgVariantKey]
        const tgDefault = sanitized['tagline'] || { ...DEFAULT_FIELD_CONFIGS['tagline'] }
        sanitized['tagline'] = tgVariant
          ? { ...tgDefault, left: clamp(tgVariant.left, CARD_W_PX), top: clamp(tgVariant.top, CARD_H_PX, 0) }
          : { ...tgDefault }
      }
      // [DEBUG] Trace loaded Material Text & Tagline positions

      setFields(sanitized)
      setSelectedField(visibleKeys[0] || null)
    })
  }, [labId, templateKey, selectedMaterial, isFront])

  const handleMouseDown = useCallback((field: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const cfg = resolveFieldCfg(field)
    dragRef.current = { field, startX: e.clientX, startY: e.clientY, origLeft: cfg.left, origTop: cfg.top }
    setSelectedField(field)

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = (ev.clientX - d.startX) / SCALE
      const dy = (ev.clientY - d.startY) / SCALE
      const targetKey = fieldEditKey(d.field)
      setFields((prev) => ({
        ...prev,
        [targetKey]: {
          ...(prev[targetKey] ?? prev[d.field]),
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
    const cfg = resolveFieldCfg(field)
    resizeRef.current = { field, startX: e.clientX, origLeft: cfg.left, origWidth: cfg.width || 80 }

    const onMove = (ev: MouseEvent) => {
      const r = resizeRef.current
      if (!r) return
      const dw = (ev.clientX - r.startX) / SCALE
      const newWidth = Math.max(20, r.origWidth + dw)
      const targetKey = fieldEditKey(r.field)
      setFields((prev) => ({
        ...prev,
        [targetKey]: {
          ...(prev[targetKey] ?? prev[r.field]),
          width: newWidth,
          // Right-anchored fields grow toward the LEFT; the right edge (imaginary line) stays fixed.
          left: isRightAnchored(r.field)
            ? clamp(r.origLeft + r.origWidth - newWidth, CARD_W_PX)
            : prev[r.field].left,
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
  useEffect(() => {
    console.log('CURRENT MATERIAL', selectedMaterial)
    console.log('GENERIC TAGLINE', fields['tagline'])
    console.log('DMLS TAGLINE', fields['tagline_dmls'])

    console.log('GENERIC MATERIAL', fields['material_text'])
    console.log('DMLS MATERIAL', fields['material_text_dmls'])
  }, [fields, selectedMaterial])
  const handleSave = async () => {
    console.log('SAVE MATERIAL', selectedMaterial)
    console.log('SAVE TAGLINE', fields['tagline'])
    console.log('SAVE TAGLINE DMLS', fields['tagline_dmls'])
    console.log('SAVE TAGLINE PFM', fields['tagline_pfm'])
    console.log('SAVE TAGLINE ZIRCONIA', fields['tagline_zirconia'])

    console.log('SAVE MATERIAL_TEXT', fields['material_text'])
    console.log('SAVE MATERIAL_TEXT DMLS', fields['material_text_dmls'])
    console.log('SAVE MATERIAL_TEXT PFM', fields['material_text_pfm'])
    console.log('SAVE MATERIAL_TEXT ZIRCONIA', fields['material_text_zirconia'])
    setIsSaving(true)
    try {
      const toSave = { ...fields }
      // Persist the Material Text & Tagline positions ONLY for the currently selected material
      if (isFront && toSave['material_text'] && toSave['tagline']) {
        // Material Text — keep the material-specific key (drag writes there),
        // but apply shared styling (font/bold/width) edits.
        const mtVariantKey = materialTextVariantKey(selectedMaterial)
        const mtBase = toSave[mtVariantKey] ?? toSave['material_text']
        toSave[mtVariantKey] = {
          ...mtBase,
          fontSize: toSave['material_text'].fontSize,
          bold: toSave['material_text'].bold,
          width: toSave['material_text'].width,
        }
        const origMt = originalMaterialTextRef.current
        if (origMt) {
          toSave['material_text'] = {
            ...origMt,
            fontSize: toSave['material_text'].fontSize,
            bold: toSave['material_text'].bold,
            width: toSave['material_text'].width,
          }
        }
        // Tagline — same handling
        const tgVariantKey = taglineVariantKey(selectedMaterial)
        const tgBase = toSave[tgVariantKey] ?? toSave['tagline']
        toSave[tgVariantKey] = {
          ...tgBase,
          fontSize: toSave['tagline'].fontSize,
          bold: toSave['tagline'].bold,
          width: toSave['tagline'].width,
        }
        const origTg = originalTaglineRef.current
        if (origTg) {
          toSave['tagline'] = {
            ...origTg,
            fontSize: toSave['tagline'].fontSize,
            bold: toSave['tagline'].bold,
            width: toSave['tagline'].width,
          }
        }
      }
      // [DEBUG] Trace Material Text & Tagline being saved
      console.log('--------------------------------')
      console.log('SAVE')
      console.log('Material:', selectedMaterial)
      console.log('Tagline Save Key:', taglineVariantKey(selectedMaterial))
      console.log('Material Text Save Key:', materialTextVariantKey(selectedMaterial))
      console.log('Saving Tagline Position:', isFront ? toSave[taglineVariantKey(selectedMaterial)] : undefined)
      console.log('Saving Material Position:', isFront ? toSave[materialTextVariantKey(selectedMaterial)] : undefined)
      console.log('--------------------------------')
      console.log("===== FINAL SAVE OBJECT =====");
      console.log(JSON.stringify(toSave, null, 2));
      await saveTemplateConfig(labId, templateKey, toSave)
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
                  const cfg =
                    key === 'material_text'
                      ? fields[materialTextVariantKey(selectedMaterial)] ?? fields['material_text']
                      : key === 'tagline'
                        ? fields[taglineVariantKey(selectedMaterial)] ?? fields['tagline']
                        : fields[key]
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${fields[selectedField].bold
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
