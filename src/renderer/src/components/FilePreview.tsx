import { useEffect, useState } from 'react'
import type { FilePreviewData } from '../../../shared/types'

export function FilePreview({ filePath }: { filePath: string }) {
  const [preview, setPreview] = useState<FilePreviewData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filePath || filePath.startsWith('http')) { setPreview(null); return }
    setLoading(true)
    window.brain.readFilePreview(filePath).then(d => { setPreview(d); setLoading(false) }).catch(() => { setPreview({ type: 'unknown' }); setLoading(false) })
  }, [filePath])

  if (loading) return <div style={{ padding: 12, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Loading…</div>
  if (!preview || preview.type === 'unknown') return <div style={{ padding: 12, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>No preview</div>
  if (preview.type === 'image' && preview.dataUrl) return <div style={{ padding: 8 }}><img src={preview.dataUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, objectFit: 'contain' }} /></div>
  if (preview.type === 'pdf' && preview.dataUrl) return <div style={{ padding: 8, height: 260 }}><embed src={preview.dataUrl} type="application/pdf" style={{ width: '100%', height: '100%', borderRadius: 6 }} /></div>
  if (preview.type === 'text' && preview.text) return <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 6, margin: '4px 8px', maxHeight: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, color: 'rgba(200,220,240,0.8)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{preview.text}</div>
  return null
}
