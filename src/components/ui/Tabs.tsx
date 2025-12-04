import * as React from "react";
import { cn } from "../../lib/utils";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (context === undefined) {
    throw new Error("Tabs components must be used within the <Tabs> component.");
  }
  return context;
};

interface TabsProps extends React.ComponentPropsWithoutRef<"div"> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ defaultValue = "", value: controlledValue, onValueChange, children, ...props }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeTab = isControlled ? controlledValue : internalValue;

  const setActiveTab = React.useCallback(
    (value: string) => {
      if (!isControlled) {
        setInternalValue(value);
      }
      onValueChange?.(value);
    },
    [isControlled, onValueChange]
  );

  const contextValue = React.useMemo(() => ({ activeTab, setActiveTab }), [activeTab, setActiveTab]);

  return (
    <div {...props}>
      <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>
    </div>
  );
};

const TabsList = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-zinc-800 p-1 text-zinc-400",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<"button"> {
  value: string;
}

const TabsTrigger = React.forwardRef<React.ElementRef<"button">, TabsTriggerProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setActiveTab(value);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        data-state={isActive ? "active" : "inactive"}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-zinc-900 text-zinc-100 shadow-sm"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.ComponentPropsWithoutRef<"div"> {
  value: string;
}

const TabsContent = React.forwardRef<React.ElementRef<"div">, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { activeTab } = useTabsContext();
    const isActive = activeTab === value;

    if (!isActive) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        aria-labelledby={`tab-${value}`}
        data-state={isActive ? "active" : "inactive"}
        className={cn(
          "mt-2 ring-offset-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
