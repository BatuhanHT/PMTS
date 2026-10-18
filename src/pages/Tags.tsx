import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, FormActions, FormError, EmptyState, Modal, PageHeader, TagChip } from '../components/ui.tsx'
import { useStore } from '../data/store-context.ts'
import { TAG_COLORS } from '../domain/types.ts'
import type { Tag } from '../domain/types.ts'
import { newId } from '../lib/format.ts'

function TagFormModal({ tag, onClose }: { tag?: Tag; onClose: () => void }) {
  const { dispatch } = useStore()
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState<string>(tag?.color ?? TAG_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const err = dispatch({ type: tag ? 'tag/update' : 'tag/add', id: tag?.id ?? newId(), name, color })
    if (err) return setError(err)
    onClose()
  }

  return (
    <Modal title={tag ? 'Etiketi düzenle' : 'Yeni etiket'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Etiket adı">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div>
          <span className="label">Renk</span>
          <div className="flex gap-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Renk ${c}`}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                className="h-7 w-7 cursor-pointer rounded-full ring-offset-2 transition"
                style={{ background: c, boxShadow: c === color ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Önizleme: <TagChip tag={{ id: 'preview', name: name.trim() || 'Etiket', color }} />
        </div>
        <FormError message={error} />
        <FormActions onCancel={onClose} submitLabel={tag ? 'Kaydet' : 'Etiketi ekle'} />
      </form>
    </Modal>
  )
}

export function Tags() {
  const { data, dispatch } = useStore()
  const [editing, setEditing] = useState<Tag | 'new' | null>(null)

  function remove(tag: Tag, count: number) {
    const note = count > 0 ? ` ${count} kalemden kaldırılır.` : ''
    if (!window.confirm(`"${tag.name}" etiketi silinsin mi?${note}`)) return
    dispatch({ type: 'tag/delete', id: tag.id })
  }

  return (
    <>
      <PageHeader
        title="Etiketler"
        subtitle="Stok kalemlerini gruplamak ve filtrelemek için serbest renkli etiketler. Varlık kodundan bağımsızdır."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Yeni etiket
          </button>
        }
      />

      <div className="card overflow-x-auto">
        {data.tags.length === 0 ? (
          <EmptyState>Henüz etiket yok.</EmptyState>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="th">Etiket</th>
                <th className="th num">Kalem sayısı</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tags.map((tag) => {
                const count = data.items.filter((i) => i.tagIds.includes(tag.id)).length
                return (
                  <tr key={tag.id}>
                    <td className="td">
                      <TagChip tag={tag} />
                    </td>
                    <td className="td num">{count}</td>
                    <td className="td text-right">
                      <button className="btn mr-2 px-2 py-0.5 text-xs" onClick={() => setEditing(tag)}>
                        Düzenle
                      </button>
                      <button className="btn btn-danger px-2 py-0.5 text-xs" onClick={() => remove(tag, count)}>
                        Sil
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && <TagFormModal tag={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
