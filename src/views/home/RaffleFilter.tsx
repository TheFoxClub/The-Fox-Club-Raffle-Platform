import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/Select";
import { Search, Filter } from "lucide-react";
import Button from "../../components/ui/Button";

export default function RaffleFilter() {
  return (
    <div className="glass-card p-4 space-y-4 rounded-lg mt-8">
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
        <Select>
          <SelectTrigger className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="bg-[hsla(240,10%,3.9%,0.5)] focus-[hsl(10 85% 58%)] border-[hsl(240,6%,20%)]">
            <SelectValue placeholder="Token Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sol">SOL</SelectItem>
            <SelectItem value="usdc">USDC</SelectItem>
            <SelectItem value="bonk">BONK</SelectItem>
            <SelectItem value="all">All Tokens</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]">
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lowtohigh">Low to High</SelectItem>
            <SelectItem value="hightolow">High to Low</SelectItem>
          </SelectContent>
        </Select>

        <Select>
          <SelectTrigger className="bg-[hsla(240,10%,3.9%,0.5)] border-[hsl(240,6%,20%)]">
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="verified">Verified Only</SelectItem>
            <SelectItem value="allcollections">All Collections</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" className="w-full border-[hsl(240,6%,20%)]">
        Clear Filters
      </Button>
    </div>
  );
}
