import * as React from "react";
import { cn } from "../../lib/utils";

// --- 1. Context for State Management ---
interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

// Create context with a safe default (or throw error if used outside provider)
const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (context === undefined) {
    throw new Error(
      "Tabs components must be used within the <Tabs> component."
    );
  }
  return context;
};

// --- 2. Tabs Root Component (Tabs) ---

interface TabsProps extends React.ComponentPropsWithoutRef<"div"> {
  defaultValue: string;
}

const Tabs: React.FC<TabsProps> = ({ defaultValue, children, ...props }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  const contextValue = React.useMemo(
    () => ({ activeTab, setActiveTab }),
    [activeTab]
  );

  return (
    <div {...props}>
      <TabsContext.Provider value={contextValue}>
        {children}
      </TabsContext.Provider>
    </div>
  );
};

// --- 3. Tabs List Component (TabsList) ---

const TabsList = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist" // Basic accessibility role
    aria-orientation="horizontal"
    className={cn(
      // Radix/Shadcn TabsList classes:
      "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
TabsList.displayName = "TabsList";

// --- 4. Tabs Trigger Component (TabsTrigger) ---

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<"button"> {
  value: string; // The identifier for this specific tab
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<"button">,
  TabsTriggerProps
>(({ className, value, children, onClick, ...props }, ref) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(value);
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      role="tab" // Basic accessibility role
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"} // For CSS targeting
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

// --- 5. Tabs Content Component (TabsContent) ---

interface TabsContentProps extends React.ComponentPropsWithoutRef<"div"> {
  value: string; // Must match the value of the corresponding trigger
}

const TabsContent = React.forwardRef<React.ElementRef<"div">, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { activeTab } = useTabsContext();
    const isActive = activeTab === value;

    if (!isActive) {
      // Hidden state (equivalent to Radix's `hidden` attribute or unmounted)
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel" // Basic accessibility role
        aria-labelledby={`tab-${value}`} // Simple ID logic (can be improved)
        data-state={isActive ? "active" : "inactive"}
        className={cn(
          // Radix/Shadcn TabsContent classes:
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

// --- 6. Export ---
export { Tabs, TabsList, TabsTrigger, TabsContent };
