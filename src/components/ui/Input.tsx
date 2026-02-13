import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      if (type === "number") {
        value = value.replace(/[^0-9.]/g, "");
        const parts = value.split(".");
        if (parts.length > 2) {
          value = parts[0] + "." + parts.slice(1).join("");
        }

        if (/^0\d+/.test(value)) {
          value = value.replace(/^0+/, "");
        }
      }

      e.target.value = value;
      onChange?.(e);
    };

    return (
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        onKeyDown={(e) => {
          if (type === "number" && ["e", "E", "+", "-"].includes(e.key)) {
            e.preventDefault();
          }
        }}
        className={cn(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-base text-zinc-100 ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-100 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
