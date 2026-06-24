import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Optional group heading to bucket this option under. */
  group?: string;
  /** Extra terms to match on when searching (besides the label). */
  keywords?: string[];
  disabled?: boolean;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  id?: string;
  align?: 'start' | 'center' | 'end';
}

/**
 * A select/combobox with a built-in search box. Drop-in replacement for the
 * Radix <Select> in cases where the list benefits from filtering. Matches the
 * SelectTrigger styling so it looks consistent across the app.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  className,
  contentClassName,
  disabled,
  id,
  align = 'start',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  // Preserve declaration order while bucketing into groups.
  const groups: { name: string | undefined; items: SearchableSelectOption[] }[] = [];
  for (const opt of options) {
    let bucket = groups.find(g => g.name === opt.group);
    if (!bucket) { bucket = { name: opt.group, items: [] }; groups.push(bucket); }
    bucket.items.push(opt);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-between font-normal px-3',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="line-clamp-1 text-left">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn('w-[--radix-popover-trigger-width] min-w-[12rem] p-0', contentClassName)}
      >
        <Command
          filter={(itemValue, searchTerm) =>
            itemValue.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map((g, gi) => (
              <CommandGroup key={g.name ?? `g${gi}`} heading={g.name}>
                {g.items.map(opt => (
                  <CommandItem
                    key={opt.value}
                    // value drives search matching; include label + keywords, keep unique via value
                    value={`${opt.label} ${(opt.keywords ?? []).join(' ')} ${opt.value}`}
                    disabled={opt.disabled}
                    onSelect={() => { onValueChange(opt.value); setOpen(false); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                    <span className="line-clamp-1">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
