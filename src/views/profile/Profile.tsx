import { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  User,
  Trophy,
  Award,
  Ticket,
  Calendar,
  Coins,
  CheckCircle,
  Gift,
  AlertCircle,
  Trash2,
  Star,
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
import ClaimPayout from "../payout/ClaimPayout";
//import { getTokenSymbol } from "../../utils/tokenUtils";
import socketService from "../../services/socket.service";
import { toast } from "react-toastify";
import { UserXPCard } from "../../components/profile/UserXPCard";
import { TokenDisplay } from "../../components/ui/TokenDisplay";
import { formatRewardType } from "../../utils/rewardTypeUtils";
import { setNotificationsCount } from "../../redux/userSlice";
import { Transaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

type HostedRaffle = {
  id: number;
  title: string;
  status: number;
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  token: string;
  tokenType: string;
  tokenAddress?: string;
  endDate: string;
  payoutInfo?: {
    totalRevenue: number;
    totalCommission: number;
    claimableAmount: number;
    claimedAmount: number;
    unclaimedAmount: number;
    canClaim: boolean;
    hasEnded: boolean;
    hasClaimed: boolean;
    claimStatus: string;
    claimTransactionId?: number;
    claimSignature?: string;
    message: string;
  };
};

type ExtendedUser = {
  id?: number;

  email?: string;
  description?: string;
  photoUrl?: string;
  totalSpent?: number;
  rafflesWon?: number;
  ticketsPurchased?: number;

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
  claimSignature?: string | null;
  winDate: string;
};

const RAFFLE_STATUS = {
  UPCOMING: 1,
  LIVE: 2,
  ENDED: 3,
  DELETED: 6,
  REFUNDED: 7,
};

const Profile = () => {
  const { publicKey, signTransaction } = useWallet();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, pubkey, user_info } = useSelector(
    (state: RootState) => state.user
  );

  const [ticketsBought, setTicketsBought] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [rafflesWon, setRafflesWon] = useState(0);
  const [hostedRafflesData, setHostedRafflesData] = useState<HostedRaffle[]>(
    []
  );

  const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);
  //const reversedPurchasedTickets = [...purchasedTickets].reverse();

  const [claimableRewards, setClaimableRewards] = useState<ClaimableReward[]>(
    []
  );
  const [wins, setWins] = useState<Win[]>([]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [raffleToDelete, setRaffleToDelete] = useState<HostedRaffle | null>(
    null
  );

  const [txState, setTxState] = useState<
    "idle" | "waitingSignature" | "confirming"
  >("idle");

  const [loadingRewards, setLoadingRewards] = useState(false);
  const unclaimedWinsCount = wins.filter((win) => !win.isClaimed).length;
  const hostedRafflesWithUnclaimedPayouts = hostedRafflesData.filter(
    (raffle) =>
      raffle.payoutInfo?.canClaim && raffle.payoutInfo?.unclaimedAmount > 0
  ).length;

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
        setTotalSpent(resUser.data.data.totalSolSpent || 0);
        setRafflesWon(resUser.data.data.rafflesWon || 0);

        dispatch(
          setUser({
            user_info: userData.user_info,
            isAuthenticated: true,
            isLoading: false,
          })
        );

        if (userData.id) {
          // Fetch hosted raffles with payout information
          const resRaffles = await server.get("/raffle/user/hosted");
          // const rafflesData = resRaffles.data.data.raffles || [];
          const rafflesData = (resRaffles.data.data.raffles || []).map(
            (r: any) => ({
              ...r,
              status:
                typeof r.status === "string"
                  ? RAFFLE_STATUS[r.status as keyof typeof RAFFLE_STATUS]
                  : r.status,
            })
          );

          setHostedRafflesData(rafflesData);

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
            tokenType: t.tokenType,
            tokenAddress: t.tokenAddress,

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

  // Socket.IO integration for real-time payout updates
  useEffect(() => {
    if (!user_info?.id) return;

    const handlePayoutUpdate = (data: any) => {
      console.log("Payout update received:", data);

      // Update hosted raffles data
      setHostedRafflesData((prev) =>
        prev.map((raffle) => {
          if (raffle.id === data.raffleId && raffle.payoutInfo) {
            return {
              ...raffle,
              payoutInfo: {
                ...raffle.payoutInfo,
                claimedAmount: data.claimedAmount,
                unclaimedAmount: Math.max(
                  0,
                  (raffle.payoutInfo?.claimableAmount || 0) - data.claimedAmount
                ),
                hasClaimed: true,
                claimStatus: data.status,
                claimSignature: data.signature,
              },
            };
          }
          return raffle;
        })
      );
    };

    const handleTransactionUpdate = (data: any) => {
      console.log("Transaction update received:", data);
    };

    // Register event listeners
    socketService.onPayoutUpdate(handlePayoutUpdate);
    socketService.onTransactionUpdate(handleTransactionUpdate);

    // Cleanup on unmount
    return () => {
      socketService.offPayoutUpdate(handlePayoutUpdate);
      socketService.offTransactionUpdate(handleTransactionUpdate);
    };
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

  const handlePayoutClaimed = (raffleId: number) => {
    // Update the hosted raffles data to reflect the claimed payout
    setHostedRafflesData((prev) =>
      prev.map((raffle) =>
        raffle.id === raffleId && raffle.payoutInfo
          ? {
              ...raffle,
              payoutInfo: {
                ...raffle.payoutInfo,
                hasClaimed: true,
                canClaim: false,
                claimStatus: "confirmed", // Set as confirmed since transaction was successful
                message: "Payout completed successfully",
              },
            }
          : raffle
      )
    );
  };

  const handleDeleteRaffle = async (raffleId: number) => {
    if (!publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }
    try {
      const res = await server.delete(`/raffle/${raffleId}`);
      if (res.data.success) {
        const txData = res.data.data;
        const transactionBuffer = Buffer.from(txData.serializedTx, "base64");
        const deserializedTransaction = Transaction.from(transactionBuffer);

        setTxState("waitingSignature");
        const signedTransaction = await signTransaction(
          deserializedTransaction
        );

        setTxState("confirming");
        const confirmDeleteRes = await server.post(`/raffle/delete/confirm`, {
          signedBase64Tx: Buffer.from(
            signedTransaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            })
          ).toString("base64"),
          checksum: txData.checksum,
          transactionDetails: txData.transactionDetails,
          raffleId,
        });
        if (confirmDeleteRes.data.success) {
          // toast.success("Creator asset refunded successfully");
          toast.success(
            "Raffle deleted successfully.Your rewards have been refunded to your wallet."
          );
          setHostedRafflesData((prev) =>
            prev.filter((raffle) => raffle.id !== raffleId)
          );
          setDeleteModalOpen(false);
          setRaffleToDelete(null);
          setTxState("idle");
        } else {
          setTxState("idle");
          toast.error(
            confirmDeleteRes.data.message || "Failed to confirm raffle delete"
          );
        }
      } else {
        toast.error(res.data.message || "Failed to delete raffle");
      }
    } catch (error: any) {
      setTxState("idle");
      console.error("Delete error:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete raffle"
      );
    }
  };

  useEffect(() => {
    const notificationCount =
      unclaimedWinsCount + hostedRafflesWithUnclaimedPayouts;

    dispatch(setNotificationsCount(notificationCount));
  }, [unclaimedWinsCount, hostedRafflesWithUnclaimedPayouts, dispatch]);

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

            <div className="flex-1 space-y-2">
              {user_info?.username ? (
                <>
                  {/* Username */}
                  <h1 className="text-xl font-bold leading-tight">
                    {user_info.username}
                  </h1>

                  {/* Wallet address */}
                  <p className="text-sm text-muted-foreground break-all">
                    {pubkey}
                  </p>
                </>
              ) : (
                <h1 className="text-lg font-bold break-all">{pubkey}</h1>
              )}
            </div>

            <Link to="/profile/EditProfile">
              <Button variant="outline" className="cursor-pointer">
                Edit Profile
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <Coins className="h-8 w-8 mx-auto text-accent" />
            <p className="text-2xl font-bold">{totalSpent.toFixed(3)} SOL</p>
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
        </div>

        {/* XP Card */}
        <UserXPCard />

        {/* {claimableRewards.length > 0 && ( */}
        {unclaimedWinsCount > 0 && (
          <Card className="bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-bold">
                    {/* You have {claimableRewards.length} unclaimed reward(s)! */}
                    You have {unclaimedWinsCount} unclaimed reward(s)!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Go to the "Wins" tab to claim your rewards
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => {
                  const element = document.querySelector(
                    '[data-tab="won"]'
                  ) as HTMLElement;
                  element?.click();
                }}
              >
                View Rewards
              </Button>
            </div>
          </Card>
        )}

        {/* Payout notification */}
        {hostedRafflesData.some(
          (raffle) =>
            raffle.payoutInfo?.canClaim &&
            raffle.payoutInfo?.unclaimedAmount > 0
        ) && (
          <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="h-6 w-6 text-green-400" />
                <div>
                  <h3 className="font-bold">
                    You have unclaimed raffle payouts!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Go to "Hosted Raffles" tab to claim your earnings
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="cursor-pointer border-green-500/30 hover:bg-green-500/10"
                onClick={() => {
                  const element = document.querySelector(
                    '[data-tab="hosted"]'
                  ) as HTMLElement;
                  element?.click();
                }}
              >
                View Payouts
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
            <TabsTrigger
              value="hostedRaffles"
              className="flex-1 md:flex-none"
              data-tab="hosted"
            >
              Hosted Raffles
              {hostedRafflesData.some(
                (raffle) =>
                  raffle.payoutInfo?.canClaim &&
                  raffle.payoutInfo?.unclaimedAmount > 0
              ) && (
                <span className="ml-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {
                    hostedRafflesData.filter(
                      (raffle) =>
                        raffle.payoutInfo?.canClaim &&
                        raffle.payoutInfo?.unclaimedAmount > 0
                    ).length
                  }
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="won"
              className="flex-1 md:flex-none"
              data-tab="won"
            >
              Wins{" "}
              {unclaimedWinsCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unclaimedWinsCount}
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
                          <TokenDisplay
                            amount={ticket.spent.toFixed(3)}
                            tokenType={ticket.tokenType}
                            tokenAddress={ticket.tokenAddress}
                          />
                          <span className="ml-1">spent</span>
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
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold">{raffle.title}</h3>
                          {raffle.status === 2 && (
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white">
                              Active
                            </div>
                          )}
                          {raffle.status === 3 && (
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary text-white">
                              Completed
                            </div>
                          )}
                          {raffle.status === 1 && (
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-secondary text-white">
                              Upcoming
                            </div>
                          )}
                          {raffle.status === 7 && (
                            <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white">
                              Refunded
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
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(raffle.endDate)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center">
                        {/* <Button variant="outline">Manage</Button> */}
                        <Link to={`/raffle/${raffle.id}`}>
                          <Button variant="outline">View</Button>
                        </Link>
                        <div className="relative group">
                          {raffle.status !== RAFFLE_STATUS.DELETED &&
                            raffle.status !== RAFFLE_STATUS.REFUNDED && (
                              <Button
                                variant="outline"
                                disabled={raffle.ticketsSold > 0}
                                onClick={() => {
                                  setRaffleToDelete(raffle);
                                  setDeleteModalOpen(true);
                                }}
                                className={`flex items-center gap-1 ${
                                  raffle.ticketsSold === 0
                                    ? "text-red-500 border-red-500 hover:bg-red-500"
                                    : "opacity-50 cursor-not-allowed"
                                }`}
                              >
                                <Trash2 size={16} />
                                Delete
                              </Button>
                            )}

                          {/*Tooltip for disabled state */}
                          {raffle.ticketsSold > 0 && (
                            <div className="absolute right-0 top-full mt-2 w-56 text-xs bg-black/80 rounded-md px-3 py-2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                              This raffle can't be deleted because tickets have
                              already been sold.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Refunded State */}
                    {raffle.status === 7 && (
                      <div className="border-t border-border/50 pt-4">
                        <div className="flex bg-red-500/10 border-red-600/30 text-primary rounded-lg p-3">
                          <div className="flex flex-row justify-between w-full">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5" />
                              <div>
                                <p className="text-sm font-semibold">
                                  Raffle Deleted & Refunded
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  All locked rewards have been successfully
                                  refunded to your wallet.
                                </p>
                              </div>
                            </div>
                            {raffle.payoutInfo?.claimSignature && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    `https://solscan.io/tx/${raffle.payoutInfo?.claimSignature}`,
                                    "_blank"
                                  )
                                }
                                className="flex items-center gap-1 text-xs text-white bg-primary"
                              >
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                                View Transaction
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payout Information */}
                    {raffle.payoutInfo && raffle.status !== 7 && (
                      <div className="border-t border-border/50 pt-4">
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                          Revenue & Payout Information
                        </h4>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Total Revenue
                            </p>
                            <p className="text-sm font-semibold">
                              <TokenDisplay
                                amount={raffle.payoutInfo.totalRevenue.toFixed(
                                  4
                                )}
                                tokenType={raffle.tokenType}
                                tokenAddress={raffle.tokenAddress}
                              />
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Platform Commission
                            </p>
                            <p className="text-sm font-semibold text-orange-400">
                              <TokenDisplay
                                amount={raffle.payoutInfo.totalCommission.toFixed(
                                  4
                                )}
                                tokenType={raffle.tokenType}
                                tokenAddress={raffle.tokenAddress}
                              />
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Your Revenue
                            </p>
                            <p className="text-sm font-semibold text-green-400">
                              {/* {raffle.payoutInfo.claimableAmount.toFixed(4)}{" "}
                              {getTokenSymbol(
                                raffle.tokenType,
                                raffle.tokenAddress,
                              )} */}
                              <TokenDisplay
                                amount={raffle.payoutInfo.claimableAmount.toFixed(
                                  4
                                )}
                                tokenType={raffle.tokenType}
                                tokenAddress={raffle.tokenAddress}
                              />
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {raffle.payoutInfo.unclaimedAmount > 0
                                ? "Unclaimed"
                                : "Claimed"}
                            </p>
                            <p
                              className={`text-sm font-semibold ${
                                raffle.payoutInfo.unclaimedAmount > 0
                                  ? "text-primary"
                                  : "text-green-400"
                              }`}
                            >
                              {raffle.payoutInfo.unclaimedAmount > 0 ? (
                                <TokenDisplay
                                  amount={raffle.payoutInfo.unclaimedAmount.toFixed(
                                    4
                                  )}
                                  tokenType={raffle.tokenType}
                                  tokenAddress={raffle.tokenAddress}
                                />
                              ) : (
                                "All claimed"
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Claim Button */}
                        {raffle.payoutInfo.canClaim &&
                          raffle.payoutInfo.unclaimedAmount > 0 && (
                            <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <Coins className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="text-sm font-semibold">
                                    Ready to claim{" "}
                                    <TokenDisplay
                                      amount={raffle.payoutInfo.unclaimedAmount.toFixed(
                                        4
                                      )}
                                      tokenType={raffle.tokenType}
                                      tokenAddress={raffle.tokenAddress}
                                    />
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Your share from this completed raffle
                                  </p>
                                </div>
                              </div>

                              <ClaimPayout
                                raffleId={raffle.id}
                                payoutAmount={raffle.payoutInfo.unclaimedAmount}
                                tokenType={raffle.tokenType}
                                tokenAddress={raffle.tokenAddress}
                                onClaimed={() => handlePayoutClaimed(raffle.id)}
                              />
                            </div>
                          )}

                        {/* Status Messages */}
                        {!raffle.payoutInfo.hasEnded && raffle.status !== 7 && (
                          <div className="flex items-center gap-2 text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                            <AlertCircle className="h-5 w-5" />
                            <div>
                              <p className="text-sm font-semibold">
                                Raffle Still Active
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {raffle.payoutInfo.message}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Already claimed or processing indicator */}
                        {raffle.payoutInfo.hasClaimed && (
                          <div
                            className={`flex items-center justify-between rounded-lg p-3 ${
                              raffle.payoutInfo.claimStatus === "confirmed"
                                ? "text-green-600 bg-green-500/10 border border-green-500/20"
                                : raffle.payoutInfo.claimStatus === "failed"
                                ? "text-red-600 bg-red-500/10 border border-red-500/20"
                                : "text-blue-600 bg-blue-500/10 border border-blue-500/20"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {raffle.payoutInfo.claimStatus === "confirmed" ? (
                                <CheckCircle className="h-5 w-5" />
                              ) : raffle.payoutInfo.claimStatus === "failed" ? (
                                <AlertCircle className="h-5 w-5" />
                              ) : (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                              )}
                              <div>
                                <p className="text-sm font-semibold">
                                  {raffle.payoutInfo.claimStatus ===
                                  "confirmed" ? (
                                    <>
                                      Payout completed:{" "}
                                      <TokenDisplay
                                        amount={raffle.payoutInfo.claimableAmount.toFixed(
                                          4
                                        )}
                                        tokenType={raffle.tokenType}
                                        tokenAddress={raffle.tokenAddress}
                                      />
                                    </>
                                  ) : raffle.payoutInfo.claimStatus ===
                                    "failed" ? (
                                    "Payout failed - please try again"
                                  ) : (
                                    `Payout ${raffle.payoutInfo.claimStatus} - processing...`
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {raffle.payoutInfo.message}
                                </p>
                              </div>
                            </div>

                            {/* View Transaction Button */}
                            {raffle.payoutInfo?.claimSignature && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    `https://solscan.io/tx/${raffle.payoutInfo?.claimSignature}`,
                                    "_blank"
                                  )
                                }
                                className="flex items-center gap-1 text-xs text-white bg-primary"
                              >
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                                View Transaction
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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

                        <p className="text-sm text-muted-foreground font-medium">
                          From: {win.raffleTitle}
                        </p>

                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                          <div className="flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            <span>
                              {win.amount} {formatRewardType(win.rewardType)}
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
                          <div className="flex gap-2">
                            {win.claimSignature && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    `https://solscan.io/tx/${win.claimSignature}`,
                                    "_blank"
                                  )
                                }
                                className="flex items-center gap-1 text-xs text-white bg-primary"
                              >
                                View Transaction
                              </Button>
                            )}
                            <Link to={`/raffle/raffle-${win.raffleId}`}>
                              <Button variant="outline" size="sm">
                                View Raffle
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
        {deleteModalOpen && raffleToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <Card className="w-full max-w-md bg-card border border-border p-6">
              {txState === "idle" && (
                <>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="text-base text-foreground">
                      Delete{" "}
                      <span className="font-bold">{raffleToDelete.title}</span>?
                    </p>

                    <span className="text-xs">
                      This will permanently remove the raffle and refund all
                      locked rewards to your wallet.
                    </span>
                  </div>

                  <div className="flex justify-between gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={txState !== "idle"}
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setRaffleToDelete(null);
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="destructive"
                      className="hover:bg-red-500 hover:text-white flex-1"
                      disabled={txState !== "idle"}
                      onClick={() => handleDeleteRaffle(raffleToDelete.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}

              {txState === "waitingSignature" && (
                <div className="text-center py-6">
                  <p className="font-semibold">
                    Waiting for wallet approval...
                  </p>
                </div>
              )}

              {txState === "confirming" && (
                <div className="text-center py-6">
                  <p className="font-semibold">Confirming transaction...</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
