import { Wallet, Ticket, Trophy, Coins, TrendingUp, Users } from "lucide-react";
import { StatCard } from "../../components/admin/StatCard";
import Button  from "../../components/ui/Button";
import { Link } from "react-router-dom";

const topRaffles = [
  { name: "Legendary Fox #001", creator: "7XYZ...abc1", volume: "245.5 SOL", tickets: 489, status: "Live" },
  { name: "Golden Den Pass", creator: "8ABC...def2", volume: "189.2 SOL", tickets: 378, status: "Live" },
  { name: "Fox Club VIP", creator: "9DEF...ghi3", volume: "156.8 SOL", tickets: 312, status: "Ended" },
];

const topCreators = [
  { wallet: "7XYZ...abc1", revenue: "1,245 SOL", rank: 1 },
  { wallet: "8ABC...def2", revenue: "987 SOL", rank: 2 },
  { wallet: "9DEF...ghi3", revenue: "756 SOL", rank: 3 },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Volume"
          value="12,458 SOL"
          change={12.5}
          trend="up"
          icon={<Wallet className="h-6 w-6" />}
        />
        <StatCard
          title="Live Raffles"
          value="47"
          change={8.2}
          trend="up"
          icon={<Ticket className="h-6 w-6" />}
        />
        <StatCard
          title="Total Tickets Sold"
          value="8,942"
          change={15.3}
          trend="up"
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Platform Fees Earned"
          value="248.5 SOL"
          change={5.1}
          trend="up"
          icon={<Coins className="h-6 w-6" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Raffles */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Performing Raffles
            </h2>
            <Link to="/admin/raffles">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {topRaffles.map((raffle, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 transition-all"
              >
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{raffle.name}</h3>
                  <p className="text-sm text-muted-foreground">{raffle.creator}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{raffle.volume}</p>
                  <p className="text-sm text-muted-foreground">{raffle.tickets} tickets</p>
                </div>
                <div className="ml-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      raffle.status === "Live"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {raffle.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Creators & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-card p-6 rounded-xl border border-border/50">
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/create">
                <Button className="w-full gradient-primary">
                  <Ticket className="h-4 w-4 mr-2" />
                  Create Raffle
                </Button>
              </Link>
              <Link to="/admin/collections">
                <Button variant="outline" className="w-full">
                  <Trophy className="h-4 w-4 mr-2" />
                  Add Collection
                </Button>
              </Link>
              <Link to="/admin/tokens">
                <Button variant="outline" className="w-full">
                  <Coins className="h-4 w-4 mr-2" />
                  Add Token
                </Button>
              </Link>
            </div>
          </div>

          {/* Top Creators */}
          <div className="glass-card p-6 rounded-xl border border-border/50">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Top Creators
            </h2>
            <div className="space-y-4">
              {topCreators.map((creator) => (
                <div key={creator.wallet} className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                    creator.rank === 1 ? "bg-gradient-primary text-white" :
                    creator.rank === 2 ? "bg-secondary/20 text-secondary" :
                    "bg-accent/20 text-accent"
                  }`}>
                    {creator.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{creator.wallet}</p>
                    <p className="text-xs text-muted-foreground">{creator.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
