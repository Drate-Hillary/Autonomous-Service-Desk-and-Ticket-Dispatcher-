import { HugeiconsIcon } from "@hugeicons/react"
import type { HugeiconsIconProps } from "@hugeicons/react"

/** Thin, sane-default wrapper so every icon in the app shares one weight. */
export function Icon({
  size = 20,
  strokeWidth = 1.75,
  ...props
}: HugeiconsIconProps) {
  return <HugeiconsIcon size={size} strokeWidth={strokeWidth} {...props} />
}
