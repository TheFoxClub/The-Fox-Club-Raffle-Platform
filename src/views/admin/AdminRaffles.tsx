import { useState } from "react";
import { Search, Filter, Edit, Ban, Star } from "lucide-react";
import Button  from "../../components/ui/Button";
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
  DialogTrigger,
} from "../../components/ui/Dialog";
import { Switch } from "../../components/ui/Switch";

const mockRaffles = [
  { id: 1, name: "Legendary Fox #001", creator: "7XYZ...abc1", token: "SOL", price: "0.5", sold: 489, total: 500, status: "Live", featured: true },
  { id: 2, name: "Golden Den Pass", creator: "8ABC...def2", token: "USDC", price: "10", sold: 378, total: 400, status: "Live", featured: false },
  { id: 3, name: "Fox Club VIP", creator: "9DEF...ghi3", token: "SOL", price: "1.0", sold: 312, total: 312, status: "Ended", featured: false },
  { id: 4, name: "Silver Fox Token", creator: "7XYZ...abc1", token: "BONK", price: "1000000", sold: 156, total: 200, status: "Live", featured: false },
];

export default function AdminRaffles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
const [, setSelectedRaffle] = useState<typeof mockRaffles[0] | null>(null);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="glass-card p-6 rounded-xl border border-border/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search raffles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
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
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockRaffles.map((raffle) => (
                <tr key={raffle.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {raffle.featured && <Star className="h-4 w-4 fill-accent text-accent" />}
                      <span className="font-medium">{raffle.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{raffle.creator}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {raffle.token}
                    </span>
                  </td>
                  <td className="p-4">{raffle.price}</td>
                  <td className="p-4">
                    <span className="text-sm">
                      {raffle.sold}/{raffle.total}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        raffle.status === "Live"
                          ? "bg-green-500/20 text-green-500"
                          : raffle.status === "Ended"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {raffle.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRaffle(raffle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Raffle</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Featured on Homepage</span>
                              <Switch defaultChecked={raffle.featured} />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Status</span>
                              <Select defaultValue={raffle.status.toLowerCase()}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="live">Live</SelectItem>
                                  <SelectItem value="suspended">Suspend</SelectItem>
                                  <SelectItem value="ended">End</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button className="w-full gradient-primary">Save Changes</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
