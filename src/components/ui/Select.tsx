import React, { useState, useRef, useEffect, forwardRef } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

/* ---------------- CONTEXT ---------------- */
type SelectContextType = {
  value?: string;
  onValueChange?: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const _contextStore: { current: SelectContextType | null } = { current: null };

const SelectContext = {
  Provider: ({
    value,
    children,
  }: {
    value: SelectContextType;
    children: React.ReactNode;
  }) => {
    _contextStore.current = value;
    return <>{children}</>;
  },
  use: () => _contextStore.current!,
};

/* ---------------- ROOT ---------------- */
export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        open,
        setOpen,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

/* ---------------- TRIGGER ---------------- */
export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(function SelectTrigger({ className, children, ...props }, ref) {
  const ctx = SelectContext.use();
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-[hsl(240,6%,20%)] bg-[hsl(240,10%,3.9%)] px-3 text-sm text-left placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(10,85%,58%)] focus:ring-offset-0 transition-shadow duration-150",
        ctx.open ? "shadow-md" : "shadow-sm",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="h-4 w-4 opacity-50 transition-transform duration-150"
        style={{ transform: ctx.open ? "rotate(180deg)" : "rotate(0deg)" }}
      />
    </button>
  );
});

/* ---------------- VALUE ---------------- */
export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = SelectContext.use();
  return (
    <span className={!ctx.value ? "text-muted-foreground" : ""}>
      {ctx.value || placeholder}
    </span>
  );
}

/* ---------------- CONTENT ---------------- */
export const SelectContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function SelectContent({ className, children, ...props }, ref) {
  const ctx = SelectContext.use();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node)
      ) {
        ctx.setOpen(false);
      }
    }
    if (ctx.open) document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ctx.open]);

  if (!ctx.open) return null;

  return (
    <div
      ref={(node) => {
        contentRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "absolute z-50 mt-1 w-full rounded-md border border-[hsl(240,6%,20%)] bg-[hsl(240,10%,3.9%)] shadow-md overflow-hidden animate-dropdown-open",
        className
      )}
      {...props}
    >
      <div className="flex flex-col p-1">{children}</div>
    </div>
  );
});

/* ---------------- ITEM ---------------- */
export const SelectItem = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(function SelectItem({ value, children, className, ...props }, ref) {
  const ctx = SelectContext.use();
  const isSelected = ctx.value === value;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
        isSelected ? "bg-accent text-accent-foreground font-semibold" : "",
        className
      )}
      onClick={() => {
        ctx.onValueChange?.(value);
        ctx.setOpen(false);
      }}
      {...props}
    >
      {isSelected && <Check className="absolute left-2 h-4 w-4" />}
      <span className={isSelected ? "ml-5" : "ml-0"}>{children}</span>
    </div>
  );
});
