import { Eye, EyeOff } from 'lucide-react'

export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      onClick={onToggle}
      className="absolute right-2.5 flex items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {visible ? (
        <EyeOff aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Eye aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  )
}
