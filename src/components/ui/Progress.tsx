import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<"div"> {
  value?: number; // Current value (0 to 100)
  max?: number; // Maximum value (defaults to 100)
}

const Progress = React.forwardRef<React.ElementRef<"div">, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const normalizedValue = max > 0 ? (value / max) * 100 : 0;
    const clampedValue = Math.min(100, Math.max(0, normalizedValue));

    const translatePercentage = 100 - clampedValue;

    return (
      // Root Container (Mimics ProgressPrimitive.Root)
      <div
        ref={ref}
        role="progressbar" // Accessibility role
        aria-valuenow={clampedValue}
        aria-valuemax={max}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        {/* Indicator (Mimics ProgressPrimitive.Indicator) */}
        <div
          className="h-full w-full flex-1 bg-primary transition-all"
          style={{
            transform: `translateX(-${translatePercentage}%)`,
          }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
