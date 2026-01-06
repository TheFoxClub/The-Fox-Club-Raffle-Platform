import { useState, useEffect } from "react";
import { Search, Filter, Edit, Ban, Star, Copy, Unlock } from "lucide-react";
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

const tokenMap: Record<number, string> = {
  0: "SOL",
  3: "USDC",
};

const statusMap: Record<number, string> = {
  2: "Live",
  1: "Upcoming",
  3: "Ended",
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

export default function AdminRaffles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchRaffles = async () => {
      try {
        const res = await server.get("/admin/raffles");
        const mapped = res.data.data.raffles.map(mapRaffle);
        setRaffles(mapped);
      } catch (err) {
        console.error("Error fetching raffles", err);
      }
    };
    fetchRaffles();
  }, []);

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
            : r
        )
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
    currentlySuspended: boolean
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
            : r
        )
      );

      // Show toast from backend message
      toast.success(res.data.message);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update raffle");
    }
  };

  // Helper to highlight search term matches
  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-black">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Filtered raffles based on search term and status filter
  const filteredRaffles = raffles
    .filter((raffle) => {
      const term = searchTerm.toLowerCase();
      return (
        raffle.name.toLowerCase().includes(term) ||
        raffle.creator.toLowerCase().includes(term)
      );
    })
    .filter((raffle) => {
      if (statusFilter === "all") return true;
      return raffle.status.toLowerCase() === statusFilter.toLowerCase();
    });

  return (
    <div className="w-84 md:w-full">
      {/* Search and Filters */}
      <div className="glass-card p-4 sm:p-6 rounded-xl mb-4 border border-border/50">
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search raffles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
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
              {filteredRaffles.map((raffle) => (
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
                    {raffle.totalRevenue.toFixed(2)} {raffle.token}
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
                            raffle.status === "Suspended"
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
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
