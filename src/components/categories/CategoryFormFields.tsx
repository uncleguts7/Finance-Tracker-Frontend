import { Control, Controller } from 'react-hook-form'
import { LockKeyhole, SlidersHorizontal } from 'lucide-react'

import type { CategoryInput } from '@/lib/schemas'
import type { ExpenseType } from '@/lib/types'
import { cn } from '@/lib/utils'

const OPTIONS: Array<{ value: ExpenseType; label: string; hint: string; icon: typeof LockKeyhole }> = [
  { value: 'fixed', label: 'Fixed', hint: 'Recurring each cycle', icon: LockKeyhole },
  { value: 'variable', label: 'Variable', hint: 'Changes month to month', icon: SlidersHorizontal },
]

/** Segmented Fixed/Variable radio cards matching the Stitch reference. */
export function TypeRadioField({ control }: { control: Control<CategoryInput> }) {
  return (
    <Controller
      control={control}
      name="default_type"
      render={({ field }) => (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Default type">
          {OPTIONS.map(({ value, label, hint, icon: Icon }) => {
            const selected = field.value === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => field.onChange(value)}
                className={cn(
                  'flex h-10 items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span className="sr-only">{hint}</span>
              </button>
            )
          })}
        </div>
      )}
    />
  )
}
