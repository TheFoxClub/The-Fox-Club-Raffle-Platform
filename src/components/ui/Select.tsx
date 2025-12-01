import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface SelectContextType {
  value: string | undefined;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  registerItem: (val: string, label: React.ReactNode) => void;
  unregisterItem: (val: string) => void;
  itemsRef: React.MutableRefObject<Map<string, React.ReactNode>>;
}
const SelectContext = React.createContext<SelectContextType | null>(null);

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value: controlledValue, defaultValue, onValueChange, children }) => {
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = useState(false);
  const itemsRef = useRef(new Map<string, React.ReactNode>());

  const setValue = useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v);
      onValueChange?.(v);
      setOpen(false);
    },
    [isControlled, onValueChange]
  );

  const registerItem = useCallback((val: string, label: React.ReactNode) => {
    itemsRef.current.set(val, label);
  }, []);

  const unregisterItem = useCallback((val: string) => {
    itemsRef.current.delete(val);
  }, []);

  return (
    <SelectContext.Provider value={{ value, setValue, open, setOpen, registerItem, unregisterItem, itemsRef }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

interface SelectGroupProps {
  children: React.ReactNode;
}

export const SelectGroup: React.FC<SelectGroupProps> = ({ children }) => (
  <div className="select-group">{children}</div>
);

interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder = "Select an option" }) => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  const map = ctx.itemsRef.current;
  let display: React.ReactNode = placeholder;
  if (ctx.value && map) display = map.get(ctx.value) ?? placeholder;
  return <span className="line-clamp-1">{display}</span>;
};

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);
    if (!ctx) return null;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-offset-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={() => ctx.setOpen(!ctx.open)}
        aria-expanded={ctx.open}
        aria-haspopup="listbox"
        {...props}
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", ctx.open && "rotate-180")} />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          ctx?.setOpen(false);
        }
      };
      if (ctx?.open) document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ctx]);

    if (!ctx) return null;
    if (!ctx.open) return null;

    return (
      <div
        ref={(node) => {
          wrapperRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "absolute z-50 mt-1 max-h-96 min-w-[8rem] w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-md",
          className
        )}
        role="listbox"
        {...props}
      >
        <div className="p-1 max-h-[200px] overflow-y-auto">{children}</div>
      </div>
    );
  }
);
SelectContent.displayName = "SelectContent";

interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold text-zinc-400", className)} {...props} />
  )
);
SelectLabel.displayName = "SelectLabel";

export interface SelectItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  value: string;
  children?: React.ReactNode;
}

export const SelectItem = React.forwardRef<HTMLLIElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);

    useEffect(() => {
      ctx?.registerItem(value, children);
      return () => ctx?.unregisterItem(value);
    }, [value, children, ctx]);

    const selected = ctx?.value === value;

    return (
      <li
        ref={ref}
        role="option"
        aria-selected={selected}
        tabIndex={0}
        onClick={() => ctx?.setValue(value)}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-zinc-800 hover:text-zinc-100 transition-colors",
          selected && "text-orange-500 font-semibold",
          className
        )}
        {...props}
      >
        {selected && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
        {children}
      </li>
    );
  }
);
SelectItem.displayName = "SelectItem";

interface SelectSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  className?: string;
}

export const SelectSeparator = React.forwardRef<HTMLHRElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) => (
    <hr ref={ref} className={cn("-mx-1 my-1 h-px bg-zinc-700", className)} {...props} />
  )
);
SelectSeparator.displayName = "SelectSeparator";

export default Select;
