import { useState } from "react";
import { Trophy, Download, RotateCcw, Copy, RefreshCw } from "lucide-react";
import Button from "../../components/ui/Button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
import { toast } from "react-toastify";
import { useEffect } from "react";
import server from "../../config/server";
import { getTokenSymbol } from "../../utils/tokenUtils";

export default function AdminLeaderboards() {
  const [activeTab, setActiveTab] = useState("hosts");

  const [loading, setLoading] = useState(true);
  const [topHosts, setTopHosts] = useState<any[]>([]);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);

  const shortWallet = (wallet: string) =>
    wallet.slice(0, 4) + "..." + wallet.slice(-4);

  const mapNumericTokenType = (numericTokenType: number): string => {
    switch (numericTokenType) {
      case 0:
        return "SOLANA";
      case 1:
        return "SPL_TOKEN";
      case 2:
        return "SPL_TOKEN_2022";
      case 3:
        return "USDC";
      default:
        return "SOLANA";
    }
  };

  const formatAmount = (
    amount: number,
    tokenType: string,
    tokenAddress?: string
  ) => {
    if (amount === null || amount === undefined)
      return `0 ${getTokenSymbol(tokenType, tokenAddress)}`;
    return `${amount} ${getTokenSymbol(tokenType, tokenAddress)}`;
  };

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const res = await server.get("/admin/leaderboard");
      const { topHosts, topBuyers } = res.data.data;

      setTopHosts(
        topHosts.map((host: any) => ({
          walletAddress: host.walletAddress,
          totalRevenue: host.totalRevenueSol,
          tokenType: mapNumericTokenType(host.tokenType || 0),
          tokenAddress: host.tokenAddress,
          rafflesCount: host.rafflesCount,
          xp: 0,
          //  streak: 0,
        }))
      );

      setTopBuyers(
        topBuyers.map((buyer: any) => ({
          walletAddress: buyer.walletAddress,
          spending: buyer.totalSolSpent,
          tokenType: mapNumericTokenType(buyer.tokenType || 0),
          tokenAddress: buyer.tokenAddress,
          tickets: buyer.ticketsBought,
          xp: 0,
          //  streak: 0,
        }))
      );
    } catch (error) {
      console.error("Error fetching leaderboards:", error);
      toast.error("Failed to refresh leaderboards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  if (loading) return <p>Loading leaderboards...</p>;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  return (
    <div className="w-84 md:w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leaderboards</h2>
          <p className="text-muted-foreground">
            View and manage top performing users
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="icon"
            onClick={fetchLeaderboards}
            disabled={loading}
            title="Refresh leaderboards"
            className="hover:bg-accent"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin text-muted-foreground" : ""
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="hosts">Top Hosts</TabsTrigger>
          <TabsTrigger value="buyers">Top Buyers</TabsTrigger>
        </TabsList>

        <TabsContent value="hosts" className="mt-6">
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Rank</th>
                    <th className="p-4 font-medium">Wallet</th>
                    <th className="p-4 font-medium">Total Revenue</th>
                    <th className="p-4 font-medium">Raffles</th>
                  </tr>
                </thead>
                <tbody>
                  {topHosts.length > 0 ? (
                    topHosts.map((host, index) => (
                      <tr
                        key={host.walletAddress}
                        className="border-b border-border/30 hover:bg-muted/20"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                                index === 0
                                  ? "bg-gradient-primary text-white"
                                  : index === 1
                                  ? "bg-secondary/20 text-secondary"
                                  : index === 2
                                  ? "bg-accent/20 text-accent"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                            {index < 3 && (
                              <Trophy className="h-4 w-4 text-accent" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium">
                          <button
                            onClick={() => copyToClipboard(host.walletAddress)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                          >
                            {shortWallet(host.walletAddress)}
                            <Copy className="h-3 w-3 opacity-50" />
                          </button>
                        </td>
                        <td className="p-4 text-primary font-bold">
                          {formatAmount(
                            host.totalRevenue,
                            host.tokenType,
                            host.tokenAddress
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {host.rafflesCount}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-muted-foreground p-4"
                      >
                        No top hosts available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="buyers" className="mt-6">
          <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Rank</th>
                    <th className="p-4 font-medium">Wallet</th>
                    <th className="p-4 font-medium">Total Spending</th>
                    <th className="p-4 font-medium">Tickets</th>
                    {/* <th className="p-4 font-medium">XP</th>
                    <th className="p-4 font-medium">Streak</th> */}
                  </tr>
                </thead>
                <tbody>
                  {topBuyers.length > 0 ? (
                    topBuyers.map((buyer, index) => (
                      <tr
                        key={buyer.walletAddress}
                        className="border-b border-border/30 hover:bg-muted/20"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                                index === 0
                                  ? "bg-gradient-primary text-white"
                                  : index === 1
                                  ? "bg-secondary/20 text-secondary"
                                  : index === 2
                                  ? "bg-accent/20 text-accent"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                            {index < 3 && (
                              <Trophy className="h-4 w-4 text-accent" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium">
                          <button
                            onClick={() => copyToClipboard(buyer.walletAddress)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                          >
                            {shortWallet(buyer.walletAddress)}
                            <Copy className="h-3 w-3 opacity-50" />
                          </button>
                        </td>
                        <td className="p-4 text-accent font-bold">
                          {formatAmount(
                            buyer.spending,
                            buyer.tokenType,
                            buyer.tokenAddress
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {buyer.tickets}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-muted-foreground p-4"
                      >
                        No top buyers available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
