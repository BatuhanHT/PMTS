import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { PageHeader } from '../components/ui.tsx'
import { useStore } from '../data/store-context.ts'
import { today } from '../lib/format.ts'

export function Settings() {
  const { data, importJson, loadSample, clearAll } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pmts-yedek-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ ok: true, text: 'Yedek dosyası indirildi.' })
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    if (!window.confirm('Mevcut tüm veriler, dosyadaki verilerle değiştirilecek. Devam edilsin mi?')) return
    const error = importJson(await file.text())
    setMessage(error ? { ok: false, text: error } : { ok: true, text: 'Veriler içe aktarıldı.' })
  }

  function confirmThen(question: string, action: () => void, done: string) {
    if (!window.confirm(question)) return
    action()
    setMessage({ ok: true, text: done })
  }

  const summary = [
    [data.items.length, 'kalem'],
    [data.prices.length, 'fiyat kaydı'],
    [data.movements.length, 'stok hareketi'],
    [data.projects.length, 'proje'],
    [data.tags.length, 'etiket'],
  ]

  return (
    <>
      <PageHeader title="Ayarlar" subtitle="Veriler bu cihazda, tarayıcının yerel depolamasında saklanır." />

      {message && (
        <p
          role="status"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
        >
          {message.text}
        </p>
      )}

      <div className="space-y-4">
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Yedekleme</h2>
          <p className="mt-1 text-sm text-slate-500">
            Şu an kayıtlı: {summary.map(([n, label]) => `${n} ${label}`).join(' · ')}. Tarayıcı verisi
            temizlenirse kayıtlar kaybolur, bu yüzden düzenli olarak yedek alın.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" onClick={exportJson}>
              JSON olarak dışa aktar
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              JSON içe aktar…
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Veri sıfırlama</h2>
          <p className="mt-1 text-sm text-slate-500">Bu işlemler mevcut verilerin tamamını değiştirir. Önce yedek alın.</p>
          <div className="mt-3 flex gap-2">
            <button
              className="btn"
              onClick={() =>
                confirmThen('Mevcut veriler silinip örnek veri yüklensin mi?', loadSample, 'Örnek veri yüklendi.')
              }
            >
              Örnek veriyi yükle
            </button>
            <button
              className="btn btn-danger"
              onClick={() =>
                confirmThen('Tüm veriler silinip boş başlatılsın mı? Bu işlem geri alınamaz.', clearAll, 'Tüm veriler silindi.')
              }
            >
              Verileri sıfırla (boş başlat)
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
