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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Top Performing Raffles */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Performing Raffles
            </h2>
            <Link to="/admin/raffles">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {topRaffles.map((raffle, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 transition-all gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 text-sm sm:text-base truncate">{raffle.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{raffle.creator}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-sm sm:text-base">{raffle.volume}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{raffle.tickets} tickets</p>
                </div>
                <div className="sm:ml-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
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
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Actions */}
          <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
            <h2 className="text-base sm:text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-2 sm:space-y-3">
              <Link to="/create" className="block">
                <Button className="w-full gradient-primary text-sm sm:text-base">
                  <Ticket className="h-4 w-4 mr-2" />
                  Create Raffle
                </Button>
              </Link>
              <Link to="/admin/collections" className="block">
                <Button variant="outline" className="w-full text-sm sm:text-base">
                  <Trophy className="h-4 w-4 mr-2" />
                  Add Collection
                </Button>
              </Link>
              <Link to="/admin/tokens" className="block">
                <Button variant="outline" className="w-full text-sm sm:text-base">
                  <Coins className="h-4 w-4 mr-2" />
                  Add Token
                </Button>
              </Link>
            </div>
          </div>

          {/* Top Creators */}
          <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
            <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Top Creators
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {topCreators.map((creator) => (
                <div key={creator.wallet} className="flex items-center gap-2 sm:gap-3">
                  <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                    creator.rank === 1 ? "bg-gradient-primary text-white" :
                    creator.rank === 2 ? "bg-secondary/20 text-secondary" :
                    "bg-accent/20 text-accent"
                  }`}>
                    {creator.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{creator.wallet}</p>
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
