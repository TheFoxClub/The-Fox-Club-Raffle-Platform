import { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  User,
  Trophy,
  Flame,
  TrendingUp,
  Award,
  Ticket,
  Calendar,
  Coins,
  CheckCircle,
  Gift,
  AlertCircle,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
import server from "../../config/server";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { setUser, setLoading } from "../../redux/userSlice";
import { Link } from "react-router-dom";
import ClaimReward from "../claim/ClaimReward";

type HostedRaffle = {
  id: number;
  title: string;
  status: number;
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  token: string;
  endDate: string;
};

type ExtendedUser = {
  id?: number;
  username?: string;
  email?: string;
  description?: string;
  photoUrl?: string;
  totalSpent?: number;
  rafflesWon?: number;
  ticketsPurchased?: number;
  reputation?: number;
  xp?: number;
  xpGoal?: number;
};

type ClaimableReward = {
  id: string | number;
  raffleId: string | number;
  raffleTitle: string;
  rewardName: string;
  amount: number;
  rewardType: string;
  mintAddress: string;
  imageUrl?: string;
  isClaimed: boolean;
  claimedAt?: string | null;
  transferSignature?: string;
  receiverWallet?: string;
  transferredAt?: string;
};

type Win = {
  id: string | number;
  raffleId: string | number;
  raffleTitle: string;
  rewardId: string | number;
  rewardName: string;
  amount: number;
  rewardType: string;
  mintAddress: string;
  imageUrl?: string;
  isClaimed: boolean;
  claimedAt?: string | null;
  winDate: string;
};

const Profile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, pubkey, user_info } = useSelector(
    (state: RootState) => state.user
  );

  const {
    rafflesWon = 0,
    reputation = 0,
    xp = 0,
    xpGoal = 15000,
  } = (user_info ?? {}) as ExtendedUser;

  const [ticketsBought, setTicketsBought] = useState(0);
  const [totalSolSpent, setTotalSolSpent] = useState(0);
  const [hostedRafflesData, setHostedRafflesData] = useState<HostedRaffle[]>(
    []
  );
  const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);
  const [claimableRewards, setClaimableRewards] = useState<ClaimableReward[]>(
    []
  );
  const [wins, setWins] = useState<Win[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const formatEndDate = (dateString: string) => {
    if (!dateString) return "N/A";

    const today = new Date();
    const ticketDate = new Date(dateString);

    const formattedDate = ticketDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return ticketDate >= today
      ? `Ends ${formattedDate}`
      : `Ended ${formattedDate}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Fetch user info, hosted raffles, and tickets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUser = await server.get("/user/info");
        const userData = resUser.data.data.user;

        setTicketsBought(resUser.data.data.ticketsBought || 0);
        setTotalSolSpent(resUser.data.data.totalSolSpent || 0);

        dispatch(
          setUser({
            user_info: userData,
            isAuthenticated: true,
            isLoading: false,
          })
        );

        if (userData.id) {
          // Fetch hosted raffles
          const resRaffles = await server.get(`/raffle/user/${userData.id}`);
          const raffles = resRaffles.data.data.raffles || [];

          setHostedRafflesData(
            raffles.map(
              (r: any): HostedRaffle => ({
                id: r.id,
                title: r.title,
                status: r.status,
                token: r.token ?? "SOL",
                ticketsSold: r.ticketsSold ?? 0,
                totalTickets: r.totalTickets ?? 0,
                revenue: (r.ticketsSold ?? 0) * (r.ticketPrice ?? 0),
                endDate: r.endDate.split("T")[0],
              })
            )
          );

          // Fetch wins
          await fetchWins(userData.id);
        }

        // Fetch purchased tickets
        const resTickets = await server.get("/ticket/user-tickets");
        const tickets = resTickets.data?.data?.tickets ?? [];

        setPurchasedTickets(
          tickets.map((t: any) => ({
            id: t.id,
            raffleId: t.id,
            raffleTitle: t.title ?? "Unknown Raffle",
            tickets: t.tickets,
            spent: t.spent,
            token: t.token ?? "SOL",
            ticketNumbers: t.ticketNumbers ?? [],
            status:
              t.Raffle?.status === 2
                ? "active"
                : t.Raffle?.status === 3
                ? "Ended"
                : "upcoming",
            endDate: t.endsAt ? t.endsAt.split("T")[0] : "N/A",
            totalTickets: t.progress?.total ?? 0,
            ticketsSold: t.progress?.sold ?? 0,
          }))
        );
      } catch (error) {
        dispatch(setLoading(false));
        console.error("Error fetching user data:", error);
      }
    };

    fetchData();
  }, [dispatch]);

  // Fetch claimable rewards and wins
  useEffect(() => {
    if (user_info?.id) {
      fetchClaimableRewards();
    }
  }, [user_info?.id]);

  const fetchClaimableRewards = async () => {
    setLoadingRewards(true);
    try {
      const response = await server.get("/raffle/claimable-rewards");
      if (response.data.success) {
        const rewards = response.data.data.rewards || [];
        setClaimableRewards(rewards);

        // Update wins with claimable status
        const updatedWins = wins.map((win) => ({
          ...win,
          isClaimed: rewards.some(
            (reward: ClaimableReward) =>
              reward.id === win.rewardId && reward.isClaimed
          ),
        }));
        setWins(updatedWins);
      }
    } catch (error) {
      console.error("Failed to fetch claimable rewards:", error);
    } finally {
      setLoadingRewards(false);
    }
  };

  const fetchWins = async (userId: number) => {
    try {
      const response = await server.get("/raffle/user/wins");
      if (response.data.success) {
        const winsData = response.data.data.wins || [];
        setWins(winsData);
      }
    } catch (error) {
      console.error("Failed to fetch wins:", error);
    }
  };

  const handleRewardClaimed = (rewardId: string | number) => {
    // Update claimable rewards
    setClaimableRewards((prev) =>
      prev.map((reward) =>
        reward.id === rewardId
          ? { ...reward, isClaimed: true, claimedAt: new Date().toISOString() }
          : reward
      )
    );

    // Update wins
    setWins((prev) =>
      prev.map((win) =>
        win.rewardId === rewardId
          ? { ...win, isClaimed: true, claimedAt: new Date().toISOString() }
          : win
      )
    );

    // Update raffles won count
    dispatch(
      setUser({
        user_info: {
          ...user_info,
          rafflesWon: (user_info?.rafflesWon || 0) + 1,
        },
        isAuthenticated: true,
        isLoading: false,
      })
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-300">
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="space-y-6">
        <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center justify-center bg-gradient-primary h-24 w-24 rounded-full gradient-primary glow-primary">
              {user_info?.photoUrl ? (
                <img
                  src={user_info.photoUrl}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <User className="h-12 w-12" />
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
                  <h1 className="text-lg sm:text-lg font-bold break-all">
                    {pubkey}
                  </h1>
                  <div className="mt-2 sm:mt-0 self-start sm:self-center bg-green-900/30 backdrop-blur-sm text-green-400 px-3 hover:bg-primary hover:text-white py-1 rounded-full flex items-center gap-2 text-sm">
                    <CheckCircle size={12} /> Verified
                  </div>
                </div>
                <div className="flex flex-wrap items-center text-sm gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span className="text-muted-foreground">Level 1</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">#1 Ranked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">1 Day Streak</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">XP Progress</span>
                <span className="font-semibold mt-1 sm:mt-0">
                  {xp} / {xpGoal} XP
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full gradient-primary"
                  style={{ width: `${(xp / xpGoal) * 100}%` }}
                />
              </div>
            </div>

            <Link to="/profile/EditProfile">
              <Button variant="outline" className="cursor-pointer">
                Edit Profile
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <Coins className="h-8 w-8 mx-auto text-accent" />
            <p className="text-2xl font-bold">{totalSolSpent} SOL</p>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <Trophy className="h-8 w-8 mx-auto text-primary" />
            <p className="text-2xl font-bold">{rafflesWon}</p>
            <p className="text-sm text-muted-foreground">Raffles Won</p>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <Ticket className="h-8 w-8 mx-auto text-secondary" />
            <p className="text-2xl font-bold">{ticketsBought}</p>
            <p className="text-sm text-muted-foreground">Tickets Bought</p>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <TrendingUp className="h-8 w-8 mx-auto text-green-500" />
            <p className="text-2xl font-bold">{reputation}%</p>
            <p className="text-sm text-muted-foreground">Reputation</p>
          </Card>
        </div>

        {claimableRewards.length > 0 && (
          <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-bold">
                    You have {claimableRewards.length} unclaimed reward(s)!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Go to the "Wins" tab to claim your rewards
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() =>
                  document.querySelector('[data-tab="won"]')?.click()
                }
              >
                View Rewards
              </Button>
            </div>
          </Card>
        )}

        {/* Tabs section */}
        <Tabs defaultValue="purchasedTickets" className="space-y-4 mt-10">
          <TabsList className="p-1 w-full sm:w-auto">
            <TabsTrigger
              value="purchasedTickets"
              className="flex-1 md:flex-none"
            >
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="hostedRaffles" className="flex-1 md:flex-none">
              Hosted Raffles
            </TabsTrigger>
            <TabsTrigger
              value="won"
              className="flex-1 md:flex-none"
              data-tab="won"
            >
              Wins{" "}
              {claimableRewards.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {claimableRewards.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchasedTickets" className="space-y-4">
            {purchasedTickets.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-xl p-12 border border-border/50">
                <p className="text-center text-muted-foreground">
                  You haven't bought any tickets yet. Explore raffles and join
                  one to get started!
                </p>
              </Card>
            ) : (
              purchasedTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="bg-card/50 backdrop-blur-xl p-6 border border-border/50"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold">
                          {ticket.raffleTitle}
                        </h3>
                        {ticket.status === "active" ? (
                          <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-secondary text-white w-fit">
                            Active
                          </div>
                        ) : ticket.status === "ended" ? (
                          <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary text-white w-fit">
                            Ended
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <div className="flex items-center gap-1">
                          <Ticket className="h-4 w-4" />
                          <span>{ticket.ticketNumbers.length} tickets</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4" />
                          <span>
                            {ticket.spent} {ticket.token} spent
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatEndDate(ticket.endDate)}</span>
                        </div>
                      </div>

                      {ticket.ticketNumbers?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            {ticket.ticketNumbers.length === 1
                              ? "Ticket Number:"
                              : "Ticket Numbers:"}
                          </span>

                          {ticket.ticketNumbers.map((num: number) => (
                            <span
                              key={num}
                              className="px-2 py-0.5 rounded-md bg-secondary/20 text-secondary border border-secondary/30"
                            >
                              #{num}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link to={`/raffle/${ticket.raffleId}`}>
                      <Button variant="outline">View Raffle</Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="hostedRaffles" className="space-y-6">
            {hostedRafflesData.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No raffles hosted yet.
              </p>
            ) : (
              hostedRafflesData.map((raffle) => (
                <Card
                  key={raffle.id}
                  className="bg-card/50 backdrop-blur-xl border border-border/50 p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold">{raffle.title}</h3>
                        {raffle.status === 2 && (
                          <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white w-fit">
                            Active
                          </div>
                        )}
                        {raffle.status === 3 && (
                          <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary text-white w-fit">
                            Completed
                          </div>
                        )}
                        {raffle.status === 1 && (
                          <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-secondary text-white w-fit">
                            Upcoming
                          </div>
                        )}
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <div className="flex items-center gap-1">
                          <Ticket className="h-4 w-4" />
                          <span>
                            {raffle.ticketsSold} / {raffle.totalTickets} sold
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-accent" />
                          <span>
                            {(raffle.revenue ?? 0).toFixed(4)} {raffle.token}{" "}
                            revenue
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{raffle.endDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline">Manage</Button>
                      <Link to={`/raffle/${raffle.id}`}>
                        <Button variant="outline">View</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="won" className="space-y-4">
            {loadingRewards ? (
              <Card className="bg-card/50 backdrop-blur-xl p-12 border border-border/50">
                <p className="text-center text-muted-foreground">
                  Loading your rewards...
                </p>
              </Card>
            ) : wins.length === 0 ? (
              <Card className="bg-card/50 backdrop-blur-xl p-12 border border-border/50">
                <p className="text-center text-muted-foreground">
                  No wins yet! Keep participating and try your luck.
                </p>
              </Card>
            ) : (
              wins.map((win) => (
                <Card
                  key={win.id}
                  className="bg-card/50 backdrop-blur-xl border border-border/50 p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {win.imageUrl ? (
                          <img
                            src={win.imageUrl}
                            alt={win.rewardName}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Gift className="h-8 w-8 text-primary" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">
                            {win.rewardName}
                          </h3>
                          {win.isClaimed ? (
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-green-500/20 text-green-400">
                              <CheckCircle size={12} className="mr-1" />
                              Claimed
                            </div>
                          ) : (
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary/20 text-primary">
                              <AlertCircle size={12} className="mr-1" />
                              Ready to Claim
                            </div>
                          )}
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                          <div className="flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            <span>
                              {win.amount} {win.rewardType}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Won on {formatDate(win.winDate)}</span>
                          </div>

                          {win.claimedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>
                                Claimed on {formatDate(win.claimedAt)}
                              </span>
                            </div>
                          )}
                        </div>

                        {win.mintAddress && (
                          <p className="text-xs text-muted-foreground break-all">
                            Mint: {win.mintAddress}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Claim Button */}
                    <div className="flex-shrink-0">
                      {!win.isClaimed ? (
                        <ClaimReward
                          raffleId={win.raffleId}
                          reward={{
                            id: win.rewardId,
                            isClaimed: win.isClaimed,
                            rewardName: win.rewardName,
                            mintAddress: win.mintAddress,
                            amount: win.amount,
                          }}
                          onClaimed={() => handleRewardClaimed(win.rewardId)}
                        />
                      ) : (
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span>Claimed</span>
                          </div>
                          <Link to={`/raffle/${win.raffleId}`}>
                            <Button variant="outline" size="sm">
                              View Raffle
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
