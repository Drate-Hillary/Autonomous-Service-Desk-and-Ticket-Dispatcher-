import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Citation } from "@/types"

export function CitationTag({ citation }: { citation: Citation }) {
  return (
    <Popover>
      <PopoverTrigger
        className="ml-0.5 inline-flex size-3.5 -translate-y-1 items-center justify-center rounded-full bg-primary/10 text-[0.5625rem] font-semibold text-primary align-super hover:bg-primary/20"
        aria-label={`Citation: ${citation.policyLabel}`}
      >
        {citation.number}
      </PopoverTrigger>
      <PopoverContent align="start">
        <p className="text-sm font-semibold text-foreground">{citation.policyLabel}</p>
        <p className="mt-1 text-muted-foreground">{citation.excerpt}</p>
      </PopoverContent>
    </Popover>
  )
}
