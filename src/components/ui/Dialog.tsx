import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

// --- 1. Dialog Context ---
interface DialogContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextType | undefined>(
  undefined
);

// --- 2. Dialog Root (Controller) ---
interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Dialog: React.FC<DialogProps> = ({ children, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setIsOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  // SCROLL LOCK: add/remove overflow hidden on body
  React.useEffect(() => {
    const original = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original || "";
    }
    return () => {
      document.body.style.overflow = original || "";
    };
  }, [open]);

  return (
    <DialogContext.Provider value={{ isOpen: open, setIsOpen }}>
      {children}
    </DialogContext.Provider>
  );
};
Dialog.displayName = "Dialog";

// --- 3. Dialog Trigger ---
const DialogTrigger: React.FC<{
  children: React.ReactNode;
  asChild?: boolean;
}> = ({ children, asChild }) => {
  const context = React.useContext(DialogContext);
  if (!context)
    throw new Error("DialogTrigger must be used within a Dialog component");

  const triggerProps = {
    onClick: () => context.setIsOpen(true),
    type: "button" as const,
  };

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, triggerProps);
  }

  return <button {...triggerProps}>{children}</button>;
};
DialogTrigger.displayName = "DialogTrigger";

// --- 4. Dialog Content (with portal) ---
const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    className?: string;
    children: React.ReactNode;
  }
>(({ className = "", children, ...props }, ref) => {
  const context = React.useContext(DialogContext);
  if (!context) return null;

  // Only render when open
  if (!context.isOpen) return null;

  // create root container for portal once
  const [portalEl] = React.useState(() => {
    const el = document.createElement("div");
    el.setAttribute("data-dialog-portal", "true");
    return el;
  });

  React.useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      if (document.body.contains(portalEl)) document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      context.setIsOpen(false);
    }
  };

  // animation classes preserved
  const styleClasses = cn(
    "grid w-full gap-4 border border-input bg-background p-6 shadow-lg duration-200 sm:rounded-lg max-w-2xl",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
    className
  );

  // modal JSX to portal
  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={ref}
        className={cn("relative w-full max-w-2xl", styleClasses)}
        tabIndex={-1}
        data-state={context.isOpen ? "open" : "closed"}
        {...props}
      >
        {children}

        <button
          onClick={() => context.setIsOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );

  return createPortal(modal, portalEl);
});
DialogContent.displayName = "DialogContent";

// --- 5. Dialog Header ---
const DialogHeader = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

// --- 6. Dialog Title ---
const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<"h2">
>(({ className = "", ...props }, ref) => (
  <h2
    ref={ref}
    id="modal-title"
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

// --- 7. Dialog Description ---
const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<"p">
>(({ className = "", ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

// --- 8. Dialog Footer ---
const DialogFooter = ({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

// --- 9. Export Components ---
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
