import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Edit,
  Ban,
  Star,
  Copy,
  Unlock,
  RefreshCw,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/Dialog";
import { Switch } from "../../components/ui/Switch";
import Pagination from "../../components/ui/Pagination";
import server from "../../config/server";
import { toast } from "react-toastify";
import { formatPrice } from "../../helpers/formatPrice";

interface RaffleDetail {
  id: number;
  raffleId: number;
  isFeatured: boolean;
  featuredPosition?: string | null;
  featuredUntil?: string | null;
}

interface Raffle {
  id: number;
  name: string;
  creator: string;
  token: string;
  price: number | string;
  sold: number;
  total: number;
  status: string;
  featured: boolean;
  totalRevenue: number;
  raffle_detail?: RaffleDetail;
  endDate?: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const tokenMap: Record<number, string> = {
  0: "SOL",
  3: "USDC",
};

const statusMap: Record<number, string> = {
  1: "Upcoming",
  2: "Live",
  3: "Ended",
  5: "Suspended",
};

const mapRaffle = (r: any): Raffle => ({
  id: r.id,
  name: r.title,
  creator: r.user?.pubkey || "Unknown",
  token: tokenMap[r.tokenType] ?? "Unknown",
  price: r.ticketPrice,
  sold: r.ticketsSold,
  total: r.totalTickets,
  status: statusMap[r.status] ?? "Unknown",
  featured: r.raffle_detail?.isFeatured ?? false,
  totalRevenue: Number(r.totalRevenue ?? 0),
  raffle_detail: r.raffle_detail,
  endDate: r.endDate,
});

const shortPubkey = (key: string) => {
  if (!key) return "Unknown";
  return key.slice(0, 4) + "..." + key.slice(-4);
};

function RafflesTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border/30">
          <td className="p-4">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-5 w-14 bg-muted rounded animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AdminRaffles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  const fetchRaffles = async (
    page: number = currentPage,
    status?: string,
    search?: string,
    limit?: number,
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: (limit || pageSize).toString(),
      });

      const filterStatus = status || statusFilter;
      if (filterStatus && filterStatus !== "all") {
        const statusMap: Record<string, string> = {
          upcoming: "1",
          live: "2",
          ended: "3",
          suspended: "5",
        };
        if (statusMap[filterStatus.toLowerCase()]) {
          params.append("status", statusMap[filterStatus.toLowerCase()]);
        }
      }

      const searchQuery = search !== undefined ? search : searchTerm;
      if (searchQuery && searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await server.get(`/admin/raffles?${params.toString()}`);
      const mapped = res.data.data.raffles.map(mapRaffle);
      setRaffles(mapped);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error("Error fetching raffles", err);
      toast.error("Failed to refresh raffles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRaffles(1);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchRaffles(1, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        setCurrentPage(1);
        fetchRaffles(1, statusFilter, searchTerm);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRaffles(page, statusFilter, searchTerm);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchRaffles(1, statusFilter, searchTerm, newPageSize);
  };

  const handleRefresh = () => {
    fetchRaffles(currentPage, statusFilter, searchTerm);
  };

  // Initialize dialog state when a raffle is selected
  useEffect(() => {
    if (selectedRaffle) {
      setIsFeatured(selectedRaffle.featured);
      // setStatus(selectedRaffle.status);
    }
  }, [selectedRaffle]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied!", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err) {
      toast.error("Failed to copy wallet address", {
        position: "top-right",
      });
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedRaffle) return;

    try {
      // Update raffle status
      // await server.put(`/admin/raffles/${selectedRaffle.id}`, {
      //   status: status,
      // });

      // Update featured
      const featuredUntil = isFeatured ? selectedRaffle.endDate : null;
      await server.put(`/admin/featured/${selectedRaffle.id}`, {
        isFeatured: isFeatured,
        featuredPosition:
          selectedRaffle.raffle_detail?.featuredPosition || null,
        featuredUntil: featuredUntil,
      });

      // Update frontend table
      setRaffles((prev) =>
        prev.map((r) =>
          r.id === selectedRaffle.id
            ? // ? { ...r, featured: isFeatured, status: status }
              { ...r, featured: isFeatured }
            : r,
        ),
      );
      if (isFeatured) {
        toast.success("Raffle is now featured on homepage!");
      } else {
        toast.info("Raffle is no longer featured.");
      }

      setOpen(false);
      setSelectedRaffle(null); // close dialog
    } catch (err) {
      console.error(err);
      toast.error("Failed to update raffle");
    }
  };

  const handleToggleSuspend = async (
    raffleId: number,
    currentlySuspended: boolean,
  ) => {
    try {
      // send toggle state
      const res = await server.put(`/admin/suspend/${raffleId}`, {
        suspend: !currentlySuspended, // toggle
      });

      const updatedRaffle = res.data.data.raffle;

      // Update table status dynamically
      setRaffles((prev) =>
        prev.map((r) =>
          r.id === raffleId
            ? {
                ...r,
                status: updatedRaffle.raffle_detail?.additionalJson?.suspended
                  ? "Suspended"
                  : "Live", // or previous status
              }
            : r,
        ),
      );

      // Show toast from backend message
      toast.success(res.data.message);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update raffle");
    }
  };

  // Helper to highlight search term matches (for server-side search results)
  const highlightText = (text: string, highlight: string) => {
    if (!highlight || !highlight.trim()) return text;
    const regex = new RegExp(
      `(${highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-black">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const filteredRaffles = raffles;

  return (
    <div className="w-84 md:w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold">Raffles Management</p>
          {!loading && pagination.total > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {pagination.total} total raffles
              {statusFilter !== "all" &&
                ` • Filtered by ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
              {searchTerm &&
                searchTerm.trim() &&
                ` • Search: "${searchTerm.trim()}"`}
            </p>
          )}
        </div>

        <Button
          variant="default"
          size="icon"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh raffles"
          className="hover:bg-accent"
        >
          <RefreshCw
            className={`h-5 w-5 ${
              loading ? "animate-spin text-muted-foreground" : ""
            }`}
          />
        </Button>
      </div>
      {/* Search and Filters */}
      <div className="glass-card p-4 sm:p-6 rounded-xl mb-4 border border-border/50">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search raffles by name or creator wallet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                ×
              </button>
            )}
            {loading && searchTerm && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => handlePageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Raffles Table */}
      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/50">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Raffle Name</th>
                <th className="p-4 font-medium">Creator</th>
                <th className="p-4 font-medium">Token</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Tickets</th>
                <th className="p-4 font-medium">Total Revenue</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <RafflesTableSkeleton />
              ) : filteredRaffles.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {searchTerm
                      ? `No raffles found matching "${searchTerm}"`
                      : pagination.total === 0
                        ? "No raffles found"
                        : "No raffles match the current filters"}
                  </td>
                </tr>
              ) : (
                filteredRaffles.map((raffle) => (
                  <tr
                    key={raffle.id}
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {raffle.featured && (
                          <Star className="h-4 w-4 fill-accent text-accent" />
                        )}
                        <span className="font-medium">
                          {highlightText(raffle.name, searchTerm)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <button
                        className="flex items-center gap-1 hover:text-primary transition"
                        onClick={() => copyToClipboard(raffle.creator)}
                      >
                        {shortPubkey(raffle.creator)}
                        <Copy className="h-3 w-3 opacity-50 ml-1" />
                      </button>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {raffle.token}
                      </span>
                    </td>
                    <td className="p-4">{formatPrice(raffle.price)}</td>
                    <td className="p-4">
                      <span className="text-sm">
                        {raffle.sold}/{raffle.total}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-primary">
                      {raffle.totalRevenue} {raffle.token}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          raffle.status === "Suspended"
                            ? "bg-primary/20 text-primary"
                            : raffle.status === "Live"
                              ? "bg-green-500/20 text-green-500"
                              : raffle.status === "Ended"
                                ? "bg-muted text-muted-foreground"
                                : "bg-secondary/20 text-secondary"
                        }`}
                      >
                        {raffle.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRaffle(raffle);
                            setOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={
                            raffle.status === "Suspended"
                              ? "text-green-500 hover:text-green-600"
                              : "text-destructive"
                          }
                          onClick={() =>
                            handleToggleSuspend(
                              raffle.id,
                              raffle.status === "Suspended",
                            )
                          }
                          title={
                            raffle.status === "Suspended"
                              ? "Unsuspend"
                              : "Suspend"
                          }
                        >
                          {raffle.status === "Suspended" ? (
                            <Unlock className="h-4 w-4 " />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={handlePageChange}
          />
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Raffle</DialogTitle>
            </DialogHeader>

            {selectedRaffle && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Featured on Homepage
                  </span>
                  <Switch
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>

                <Button
                  className="w-full gradient-primary"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
