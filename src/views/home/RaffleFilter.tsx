import { ArrowUpDown } from "lucide-react";
import Select from "../../components/ui/Select";
export type RaffleSortOption =
  | ""
  | "most-recent"
  | "ending-soon"
  | "price"
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
    { value: "price", label: "Price" },
    { value: "tickets-sold", label: "Tickets sold" },
  ];

  return (
    <div className="mt-10 flex justify-end">
      <div className="w-full sm:w-56">
        <Select
          options={sortOptions}
          value={sortBy ?? ""}
          onValueChange={(value) => onSortChange?.(value as RaffleSortOption)}
          placeholder="Sort by"
          className="border border-border/60 bg-card/70 backdrop-blur-xl"
        />
      </div>
      <div className="pointer-events-none absolute opacity-0 sm:opacity-100" aria-hidden>
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </div>
  );
}
