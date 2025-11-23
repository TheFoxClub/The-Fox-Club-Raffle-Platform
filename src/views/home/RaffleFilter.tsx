import { useState } from "react";
import Select from "../../components/ui/Select";
import { Search, Filter } from "lucide-react";
import Button from "../../components/ui/Button";

export default function RaffleFilter() {
  const [statusFilter, setStatusFilter] = useState("");
  const [tokenFilter, setTokenFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");

  const statusOptions = [
    { value: "live", label: "Live" },
    { value: "ended", label: "Ended" },
    { value: "upcoming", label: "Upcoming" },
  ];

  const tokenOptions = [
    { value: "sol", label: "SOL" },
    { value: "usdc", label: "USDC" },
    { value: "bonk", label: "BONK" },
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

  const handleClearFilters = () => {
    setStatusFilter("");
    setTokenFilter("");
    setPriceFilter("");
    setCollectionFilter("");
  };

  return (
    <div className="glass-card p-4 space-y-4 rounded-lg mt-10">
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
          placeholder="Search raffles..."
          className="flex h-10 pl-10 py-2 px-3 text-base border border-[hsl(240,6%,20%)] rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Status Filter */}
        <Select
          options={statusOptions}
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Status" // This text will appear when nothing is selected
          className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]"
        />

        {/* 2. Token Type Filter */}

        <Select
          options={tokenOptions}
          value={tokenFilter}
          onValueChange={setTokenFilter}
          placeholder="Token Type" // This text will appear when nothing is selected
          className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]"
        />

        {/* 3. Price Range Filter */}
        <Select
          options={priceOptions}
          value={priceFilter}
          onValueChange={setPriceFilter}
          placeholder="Price Range" // This text will appear when nothing is selected
          className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]"
        />

        {/* 4. Collection Filter */}
        <Select
          options={collectionOptions}
          value={collectionFilter}
          onValueChange={setCollectionFilter}
          placeholder="Collection" // This text will appear when nothing is selected
          className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]"
        />
      </div>
      <Button
        variant="outline"
        className="w-full border-[hsl(240,6%,20%)]"
        onClick={handleClearFilters}
      >
        Clear Filters
      </Button>
    </div>
  );
}
