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
