import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../data/store-context.ts'
import { latestPrice, stockOf } from '../domain/calc.ts'
import type { MovementInput } from '../domain/reducer.ts'
import { UNITS, VAT_RATES } from '../domain/types.ts'
import type { Item, MovementType, Project, ProjectStatus, Unit } from '../domain/types.ts'
import { formatQty, newId, today } from '../lib/format.ts'
import { MOVEMENT_LABEL, STATUS_LABEL } from '../lib/labels.ts'
import { Field, FormActions, FormError, Modal, TagPicker } from './ui.tsx'

/** Number from a text input; NaN when empty so validation can reject it. */
const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')))

export function ItemFormModal({
  item,
  onClose,
  onSaved,
}: {
  item?: Item
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const { data, dispatch } = useStore()
  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState<Unit>(item?.unit ?? 'adet')
  const [vatRate, setVatRate] = useState(item?.vatRate ?? 20)
  const [minStock, setMinStock] = useState(String(item?.minStock ?? 0))
  const [description, setDescription] = useState(item?.description ?? '')
  const [tagIds, setTagIds] = useState(item?.tagIds ?? [])
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const input = { name, unit, vatRate, minStock: num(minStock), description, tagIds }
    const id = item?.id ?? newId()
    const err = item
      ? dispatch({ type: 'item/update', id, input })
      : dispatch({ type: 'item/add', id, createdAt: today(), input })
    if (err) return setError(err)
    onSaved?.(id)
    onClose()
  }

  return (
    <Modal title={item ? `Kalemi düzenle · ${item.assetCode}` : 'Yeni stok kalemi'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Kalem adı" hint={item ? undefined : 'Varlık kodu kayıt sırasında otomatik verilir.'}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Birim">
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="KDV oranı">
            <select className="input" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}>
              {VAT_RATES.map((r) => (
                <option key={r} value={r}>
                  %{r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Minimum stok">
            <input className="input" inputMode="decimal" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </Field>
        </div>
        <Field label="Açıklama">
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div>
          <span className="label">Etiketler</span>
          <TagPicker tags={data.tags} selected={tagIds} onChange={setTagIds} />
        </div>
        <FormError message={error} />
        <FormActions onCancel={onClose} submitLabel={item ? 'Kaydet' : 'Kalemi ekle'} />
      </form>
    </Modal>
  )
}

export function PriceFormModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const { data, dispatch } = useStore()
  const latest = latestPrice(item.id, data.prices)
  const [date, setDate] = useState(today())
  const [unitPrice, setUnitPrice] = useState(latest ? String(latest.unitPrice) : '')
  const [vatRate, setVatRate] = useState(item.vatRate)
  const [supplier, setSupplier] = useState(latest?.supplier ?? '')
  const [error, setError] = useState<string | null>(null)
  const suppliers = [...new Set(data.prices.map((p) => p.supplier).filter(Boolean))]

  function submit(e: FormEvent) {
    e.preventDefault()
    const err = dispatch({
      type: 'price/add',
      id: newId(),
      input: { itemId: item.id, date, unitPrice: num(unitPrice), vatRate, supplier },
    })
    if (err) return setError(err)
    onClose()
  }

  return (
    <Modal title={`Yeni birim fiyat · ${item.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarih">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={`Birim fiyat (₺ / ${item.unit}, KDV hariç)`}>
            <input
              className="input"
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="KDV oranı">
            <select className="input" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}>
              {VAT_RATES.map((r) => (
                <option key={r} value={r}>
                  %{r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tedarikçi">
            <input className="input" list="supplier-list" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
        </div>
        <p className="text-xs text-slate-500">
          Fiyat geçmişi silinmeden birikir. Önceki projelerin maliyeti, çıkış anındaki fiyatla sabit kalır.
        </p>
        <FormError message={error} />
        <FormActions onCancel={onClose} submitLabel="Fiyatı ekle" />
      </form>
    </Modal>
  )
}

export function MovementFormModal({
  itemId,
  projectId,
  type: initialType = 'in',
  onClose,
}: {
  /** Fixed item (opened from an item page). Omit to let the user pick. */
  itemId?: string
  /** Preselected project for stock-outs. */
  projectId?: string
  type?: MovementType
  onClose: () => void
}) {
  const { data, dispatch } = useStore()
  const [selectedItem, setSelectedItem] = useState(itemId ?? data.items[0]?.id ?? '')
  const [type, setType] = useState<MovementType>(initialType)
  const [date, setDate] = useState(today())
  const [quantity, setQuantity] = useState('')
  const [priceInput, setPriceInput] = useState<string | null>(null) // null = follow the suggestion
  const [project, setProject] = useState(projectId ?? data.projects[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const item = data.items.find((i) => i.id === selectedItem)
  const suggested = latestPrice(selectedItem, data.prices)?.unitPrice
  const price = priceInput ?? (suggested !== undefined ? String(suggested) : '')
  const stock = item ? stockOf(item.id, data.movements) : 0

  function submit(e: FormEvent) {
    e.preventDefault()
    const input: MovementInput = {
      itemId: selectedItem,
      type,
      date,
      quantity: num(quantity),
      unitPrice: type === 'adjust' ? 0 : num(price || '0'),
      projectId: type === 'out' ? project : null,
      note,
    }
    const err = dispatch({ type: 'movement/add', id: newId(), input })
    if (err) return setError(err)
    onClose()
  }

  if (data.items.length === 0) {
    return (
      <Modal title="Stok hareketi" onClose={onClose}>
        <p className="text-sm text-slate-600">Hareket girmek için önce bir stok kalemi ekleyin.</p>
      </Modal>
    )
  }

  return (
    <Modal title="Stok hareketi" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {!itemId && (
          <Field label="Kalem">
            <select
              className="input"
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value)
                setPriceInput(null)
              }}
            >
              {data.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.assetCode} · {i.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hareket tipi">
            <select className="input" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
              {(Object.keys(MOVEMENT_LABEL) as MovementType[]).map((t) => (
                <option key={t} value={t}>
                  {MOVEMENT_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tarih">
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field
            label={`Miktar${item ? ` (${item.unit})` : ''}`}
            hint={
              type === 'adjust'
                ? 'Sayım farkı için eksi değer girilebilir (örn. -5).'
                : item
                  ? `Mevcut stok: ${formatQty(stock)} ${item.unit}`
                  : undefined
            }
          >
            <input
              className="input"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </Field>
          {type !== 'adjust' && (
            <Field
              label="Birim fiyat (₺, KDV hariç)"
              hint={type === 'out' ? 'Bu fiyat harekete sabitlenir.' : 'Kayıt amaçlı, isteğe bağlı.'}
            >
              <input
                className="input"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPriceInput(e.target.value)}
              />
            </Field>
          )}
        </div>
        {type === 'out' && (
          <Field label="Proje">
            {data.projects.length === 0 ? (
              <p className="text-sm text-slate-500">Önce bir proje ekleyin.</p>
            ) : (
              <select className="input" value={project} onChange={(e) => setProject(e.target.value)}>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Not">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <FormError message={error} />
        <FormActions onCancel={onClose} submitLabel="Hareketi kaydet" />
      </form>
    </Modal>
  )
}

export function ProjectFormModal({
  project,
  onClose,
  onSaved,
}: {
  project?: Project
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const { dispatch } = useStore()
  const [name, setName] = useState(project?.name ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'planned')
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [endDate, setEndDate] = useState(project?.endDate ?? '')
  const [budget, setBudget] = useState(project ? String(project.budget) : '')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const input = { name, status, startDate, endDate, budget: num(budget || '0') }
    const id = project?.id ?? newId()
    const err = project
      ? dispatch({ type: 'project/update', id, input })
      : dispatch({ type: 'project/add', id, createdAt: today(), input })
    if (err) return setError(err)
    onSaved?.(id)
    onClose()
  }

  return (
    <Modal title={project ? `Projeyi düzenle · ${project.code}` : 'Yeni proje'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Proje adı">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durum">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Toplam bütçe (₺, KDV hariç)">
            <input className="input" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <Field label="Başlangıç">
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Bitiş">
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <FormError message={error} />
        <FormActions onCancel={onClose} submitLabel={project ? 'Kaydet' : 'Projeyi ekle'} />
      </form>
    </Modal>
  )
}
