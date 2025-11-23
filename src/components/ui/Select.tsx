import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ");

// --- Types ---
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
  className?: string; // Class for the trigger button
  contentClassName?: string; // Class for the dropdown content div
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  placeholder = "Select an option",
  className,
  contentClassName,
  onValueChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Determine the display label for the current 'value' prop
  const displayLabel = useMemo(() => {
    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  }, [value, options, placeholder]);

  // Handler for when an item is clicked
  const handleSelect = (newValue: string) => {
    // Notify the parent component of the change
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  // Logic to close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative z-[51]">
      {/* Select Trigger (Mimics SelectTrigger and SelectValue) */}
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="line-clamp-1">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 opacity-50 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Select Content (Mimics SelectContent) */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-100 max-h-96 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover border-input text-popover-foreground shadow-md transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            contentClassName
          )}
          style={{ transformOrigin: "top" }}
          role="listbox"
        >
          <ul className="p-1 max-h-[200px] overflow-y-auto">
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={value === option.value}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground transition-colors",
                  value === option.value &&
                    "text-accent-foreground font-semibold"
                )}
                tabIndex={0}
              >
                {/* Item Indicator (Mimics SelectItemIndicator) */}
                {value === option.value && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                )}
                {/* Item Text */}
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Select;
