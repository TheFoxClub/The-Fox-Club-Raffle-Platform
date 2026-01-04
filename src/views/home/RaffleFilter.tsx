import { useState } from "react";
import Select from "../../components/ui/Select";
import { Search, Filter } from "lucide-react";
import Button from "../../components/ui/Button";
type FilterParams = {
  page?: number;
  limit?: number;
  tokenType?: string;
  search?: string;
  status?: string;
  price?: string;
  collection?: string;
};

export default function RaffleFilter({
  onApplyFilters,
}: {
  onApplyFilters?: (params?: FilterParams) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [tokenFilter, setTokenFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    status: "",
    token: "",
    price: "",
    collection: "",
    search: "",
  });

  // const statusOptions = [
  //   { value: "live", label: "Live" },
  //   { value: "ended", label: "Ended" },
  //   { value: "upcoming", label: "Upcoming" },
  // ];

  const tokenOptions = [
    { value: "SOL", label: "SOL" },
    { value: "all", label: "All Tokens" },
  ];

  const priceOptions = [
    { value: "lowtohigh", label: "Low to High" },
    { value: "hightolow", label: "High to Low" },
  ];

  const collectionOptions = [
    { value: "verified", label: "Verified Only" },
    { value: "all", label: "All Collections" },
  ];

  const selectBaseClass =
    "bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]";
  const selectActiveClass = "bg-accent border-orange-500 text-white";

  const handleClearFilters = () => {
    setStatusFilter("");
    setTokenFilter("");
    setPriceFilter("");
    setCollectionFilter("");
    setSearchTerm("");
  };

  const filtersEqualApplied =
    statusFilter === appliedFilters.status &&
    tokenFilter === appliedFilters.token &&
    priceFilter === appliedFilters.price &&
    collectionFilter === appliedFilters.collection &&
    searchTerm === appliedFilters.search;

  const appliedHasAny = Boolean(
    appliedFilters.status ||
      appliedFilters.token ||
      appliedFilters.price ||
      appliedFilters.collection ||
      appliedFilters.search
  );

  const currentHasAny = Boolean(
    statusFilter || tokenFilter || priceFilter || collectionFilter || searchTerm
  );

  const handlePrimaryButton = () => {
    // If applied snapshot exists and current filters match it, treat button as Clear
    if (appliedHasAny && filtersEqualApplied) {
      // Clear applied and current selections
      setAppliedFilters({
        status: "",
        token: "",
        price: "",
        collection: "",
        search: "",
      });
      handleClearFilters();
      if (onApplyFilters) onApplyFilters(undefined);
      return;
    }

    // Otherwise apply current selections
    setAppliedFilters({
      status: statusFilter,
      token: tokenFilter,
      price: priceFilter,
      collection: collectionFilter,
      search: searchTerm,
    });

    // Build params and notify parent
    const params: FilterParams = { page: 1, limit: 10 };
    if (tokenFilter && tokenFilter !== "all") params.tokenType = tokenFilter;
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (priceFilter && priceFilter !== "") params.price = priceFilter;
    if (collectionFilter && collectionFilter !== "all")
      params.collection = collectionFilter;

    if (onApplyFilters) onApplyFilters(params);
  };

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border/50 p-4 space-y-4 rounded-lg mt-10">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <span className="text-lg font-semibold text-muted-foreground">
          Filters
        </span>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search raffles..."
          className="flex h-10 pl-10 py-2 px-3 text-base border border-[hsl(240,6%,20%)] rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Status Filter */}
        {/* <Select
          options={statusOptions}
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Status" // This text will appear when nothing is selected
          className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]"
        /> */}

        {/* 2. Token Type Filter */}

        <Select
          options={tokenOptions}
          value={tokenFilter || appliedFilters.token}
          onValueChange={setTokenFilter}
          placeholder="Token Type"
          className={`${
            tokenFilter || appliedFilters.token
              ? selectActiveClass
              : selectBaseClass
          }`}
        />

        {/* 3. Price Range Filter */}
        <Select
          options={priceOptions}
          value={priceFilter || appliedFilters.price}
          onValueChange={setPriceFilter}
          placeholder="Price Range"
          className={`${
            priceFilter || appliedFilters.price
              ? selectActiveClass
              : selectBaseClass
          }`}
        />

        {/* 4. Collection Filter */}
        <Select
          options={collectionOptions}
          value={collectionFilter || appliedFilters.collection}
          onValueChange={setCollectionFilter}
          placeholder="Collection"
          className={`${
            collectionFilter || appliedFilters.collection
              ? selectActiveClass
              : selectBaseClass
          }`}
        />
      </div>
      <Button
        variant={currentHasAny && !filtersEqualApplied ? "ghost" : "outline"}
        className="w-full border border-border"
        onClick={handlePrimaryButton}
        disabled={!currentHasAny && !appliedHasAny}
      >
        {appliedHasAny && filtersEqualApplied
          ? "Clear Filters"
          : "Apply Filters"}
      </Button>
    </div>
  );
}
