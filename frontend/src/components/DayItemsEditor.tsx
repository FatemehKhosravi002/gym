import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  flattenBlocks,
  groupBlocks,
  groupSelection,
  moveIndex,
  normalizeGroups,
  supersetLabels,
  ungroupSuperset,
  type DraftItem,
  type ItemBlock,
} from '../utils/programDraft'
import { toPersianDigits } from '../utils/persianDigits'

interface Props {
  items: DraftItem[]
  onChange: (items: DraftItem[]) => void
  onEdit: (item: DraftItem) => void
  onDelete: (item: DraftItem) => void
  /** Optional «تکرار ×N» badge for a row. */
  renderBadge?: (item: DraftItem) => React.ReactNode
  /** One-tap «جایگزینی» for exercises that were disabled in the library. */
  onReplace?: (item: DraftItem) => void
}

interface RowProps {
  item: DraftItem
  code: string
  handleProps: Record<string, any>
  isDragging: boolean
  selecting: boolean
  selected: boolean
  onToggleSelect: (key: string) => void
  onEdit: (item: DraftItem) => void
  onDelete: (item: DraftItem) => void
  onReplace?: (item: DraftItem) => void
  badge?: React.ReactNode
}

function ItemRow({
  item,
  code,
  handleProps,
  isDragging,
  selecting,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onReplace,
  badge,
}: RowProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-field border p-2 ${
        selected ? 'border-accent-400 bg-accent-50' : 'border-border bg-surface'
      } ${isDragging ? 'shadow-lifted' : ''}`}
    >
      <button
        type="button"
        {...handleProps}
        aria-label={`جابه‌جایی ${item.exerciseName}`}
        className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-field text-ink-400 hover:bg-surface-2 active:cursor-grabbing"
      >
        <span aria-hidden="true" className="text-lg leading-none">⠿</span>
      </button>

      {selecting ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`انتخاب ${item.exerciseName} برای سوپرست`}
          onClick={() => onToggleSelect(item.key)}
          className={`h-6 w-6 shrink-0 rounded-md border-2 ${
            selected ? 'border-accent-600 bg-accent-600 text-white' : 'border-border-strong bg-surface'
          }`}
        >
          {selected ? '✓' : ''}
        </button>
      ) : (
        <span className="w-8 shrink-0 text-center text-xs font-bold text-ink-500">{code}</span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{item.exerciseName}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-600">
          <span className="rounded-pill bg-primary-50 px-2 py-0.5 font-bold text-primary-900">
            {toPersianDigits(item.sets)} × {toPersianDigits(item.reps)}
          </span>
          {item.rest && <span>استراحت {toPersianDigits(item.rest)} ثانیه</span>}
          {badge}
        </p>
        {item.exerciseIsActive === false && (
          <button
            type="button"
            onClick={() => onReplace?.(item)}
            className="mt-1 inline-flex min-h-[32px] items-center gap-1 rounded-pill border border-warning-200 bg-warning-50 px-2.5 text-xs font-bold text-warning-700"
          >
            این حرکت غیرفعال شده — جایگزینی
          </button>
        )}
        {item.note && <p className="mt-1 truncate text-xs text-ink-500">{item.note}</p>}
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`ویرایش ${item.exerciseName}`}
          className="h-11 w-11 rounded-full text-ink-600 hover:bg-surface-2 hover:text-primary-900"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={`حذف ${item.exerciseName}`}
          className="h-11 w-11 rounded-full text-ink-600 hover:bg-error-50 hover:text-error-700"
        >
          🗑
        </button>
      </div>
    </div>
  )
}


interface BlockProps {
  block: ItemBlock
  labels: string[]
  position: number
  total: number
  selecting: boolean
  selectedKeys: string[]
  onToggleSelect: (key: string) => void
  onMove: (from: number, to: number) => void
  onEdit: (item: DraftItem) => void
  onDelete: (item: DraftItem) => void
  onUngroup: (group: number) => void
  onReplace?: (item: DraftItem) => void
  renderBadge?: (item: DraftItem) => React.ReactNode
}

function SortableBlock({
  block,
  labels,
  position,
  total,
  selecting,
  selectedKeys,
  onToggleSelect,
  onMove,
  onEdit,
  onDelete,
  onUngroup,
  onReplace,
  renderBadge,
}: BlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.key })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const handleProps = { ...attributes, ...listeners }

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'relative z-10' : 'relative'}>
      <div
        className={
          block.group === null
            ? 'space-y-1.5'
            : 'space-y-1.5 rounded-field border-r-4 border-accent-400 bg-accent-50 py-1.5 pr-2'
        }
      >
        {block.group !== null && (
          <div className="flex items-center justify-between gap-2 pr-1">
            <span className="rounded-pill bg-accent-100 px-2 py-0.5 text-xs font-bold text-accent-800">
              سوپرست {labels[0]?.replace(/\d+$/, '') || ''}
            </span>
            <button
              type="button"
              onClick={() => onUngroup(block.group as number)}
              className="min-h-[36px] rounded-pill px-2 text-xs font-semibold text-ink-600 hover:text-ink-900"
            >
              حذف سوپرست
            </button>
          </div>
        )}

        {block.items.map((item, index) => (
          <ItemRow
            key={item.key}
            item={item}
            code={block.group === null ? `${position + 1}` : labels[index]}
            handleProps={handleProps}
            isDragging={isDragging}
            selecting={selecting}
            selected={selectedKeys.includes(item.key)}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onReplace={onReplace}
            badge={renderBadge?.(item)}
          />
        ))}
      </div>

      {!selecting && (
        <div className="mt-1 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onMove(position, position - 1)}
            disabled={position === 0}
            aria-label="جابه‌جایی به بالا"
            className="h-9 w-9 rounded-full border border-border text-ink-600 hover:bg-surface-2 disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(position, position + 1)}
            disabled={position === total - 1}
            aria-label="جابه‌جایی به پایین"
            className="h-9 w-9 rounded-full border border-border text-ink-600 hover:bg-surface-2 disabled:opacity-40"
          >
            ↓
          </button>
        </div>
      )}
    </li>
  )
}

export default function DayItemsEditor({ items, onChange, onEdit, onDelete, onReplace, renderBadge }: Props) {
  const [selecting, setSelecting] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [groupError, setGroupError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const blocks = useMemo(() => groupBlocks(items), [items])
  const labels = useMemo(() => supersetLabels(blocks), [blocks])

  const commit = (next: DraftItem[]) => onChange(normalizeGroups(next))

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = blocks.findIndex((block) => block.key === active.id)
    const to = blocks.findIndex((block) => block.key === over.id)
    if (from < 0 || to < 0) return
    commit(flattenBlocks(moveIndex(blocks, from, to)))
  }

  const moveBlock = (from: number, to: number) => commit(flattenBlocks(moveIndex(blocks, from, to)))

  const toggleSelect = (key: string) => {
    setGroupError('')
    setSelectedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  }

  const groupSelected = () => {
    const indexes = selectedKeys
      .map((key) => items.findIndex((item) => item.key === key))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)
    if (indexes.length < 2) {
      setGroupError('برای سوپرست حداقل دو حرکت را انتخاب کنید.')
      return
    }
    const consecutive = indexes.every((index, position) => position === 0 || index === indexes[position - 1] + 1)
    if (!consecutive) {
      setGroupError('حرکات یک سوپرست باید پشت سر هم باشند.')
      return
    }
    commit(groupSelection(items, selectedKeys))
    setSelectedKeys([])
    setSelecting(false)
    setGroupError('')
  }

  if (items.length === 0) {
    return <p className="rounded-field border border-dashed border-border-strong py-4 text-center text-sm text-ink-500">هنوز حرکتی اضافه نشده است.</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500">با دستگیره ⠿ یا دکمه‌های ↑ ↓ ترتیب را تغییر دهید.</p>
        <button
          type="button"
          onClick={() => {
            setSelecting((value) => !value)
            setSelectedKeys([])
            setGroupError('')
          }}
          className="min-h-[40px] rounded-pill border border-border-strong px-3 text-xs font-semibold text-ink-700 hover:border-primary-600"
        >
          {selecting ? 'انصراف از سوپرست' : 'ساخت سوپرست'}
        </button>
      </div>

      {selecting && (
        <div className="rounded-field border border-accent-200 bg-accent-50 p-2">
          <p className="text-xs font-semibold text-accent-800">حداقل دو حرکت پشت سر هم را انتخاب کنید.</p>
          {groupError && <p className="mt-1 text-xs font-bold text-error-700">{groupError}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={groupSelected}
              className="min-h-[44px] flex-1 rounded-pill bg-accent-500 text-sm font-bold text-ink-900"
            >
              ساخت سوپرست ({toPersianDigits(selectedKeys.length)})
            </button>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((block) => block.key)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {blocks.map((block, index) => (
              <SortableBlock
                key={block.key}
                block={block}
                labels={labels[index]}
                position={index}
                total={blocks.length}
                selecting={selecting}
                selectedKeys={selectedKeys}
                onToggleSelect={toggleSelect}
                onMove={moveBlock}
                onEdit={onEdit}
                onDelete={onDelete}
                onUngroup={(group) => commit(ungroupSuperset(items, group))}
                onReplace={onReplace}
                renderBadge={renderBadge}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
