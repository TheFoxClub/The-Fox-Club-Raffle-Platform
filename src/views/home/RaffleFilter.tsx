import { ArrowDown, ArrowUp } from "lucide-react";
import Select from "../../components/ui/Select";
export type RaffleSortOption =
  | ""
  | "most-recent"
  | "ending-soon"
  | "price-desc"
  | "price-asc"
  | "tickets-sold";

export default function RaffleFilter({
  sortBy,
  onSortChange,
}: {
  sortBy?: RaffleSortOption;
  onSortChange?: (value: RaffleSortOption) => void;
}) {
  const sortOptions = [
    { value: "", label: "Default" },
    { value: "most-recent", label: "Most recent" },
    { value: "ending-soon", label: "Ending soon" },
    {
      value: "price-desc",
      label: (
        <span className="inline-flex items-center gap-2">
          <span>Price</span>
          <ArrowDown className="h-4 w-4" />
        </span>
      ),
    },
    {
      value: "price-asc",
      label: (
        <span className="inline-flex items-center gap-2">
          <span>Price</span>
          <ArrowUp className="h-4 w-4" />
        </span>
      ),
    },
    { value: "tickets-sold", label: "Tickets sold" },
  ];

  return (
    <div className="mt-10 flex justify-start">
      <div className="w-full sm:w-56">
        <Select
          options={sortOptions}
          value={sortBy ?? ""}
          onValueChange={(value) => onSortChange?.(value as RaffleSortOption)}
          placeholder="Sort by"
          className="border border-border/60 bg-card/70 backdrop-blur-xl"
        />
      </div>
    </div>
  );
}
