import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<"div"> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const normalizedValue = max > 0 ? (value / max) * 100 : 0;
    const clampedValue = Math.min(100, Math.max(0, normalizedValue));
    const translatePercentage = 100 - clampedValue;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemax={max}
        className={cn(
          "relative h-4 w-full overflow-hidden  bg-secondary rounded-full",
          className
        )}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-orange-500 transition-all"
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
