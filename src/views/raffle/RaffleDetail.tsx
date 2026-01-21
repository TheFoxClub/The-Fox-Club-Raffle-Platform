import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Progress } from "../../components/ui/Progress";
import Button from "../../components/ui/Button";
import HostProfilePopover from "../../components/ui/HostProfilePopover";
import socketService from "../../services/socket.service";

import {
  Clock,
  Users,
  Coins,
  CheckCircle,
  User,
  Calendar,
  Trophy,
  Ticket,
  AlertCircle,
  Copy,
} from "lucide-react";
// import { allRaffle } from "../../dummydata/mockRaffleDetail";
// import type { RaffleType } from "../../dummydata/mockRaffleDetail";
import server from "../../config/server";
import { toast } from "react-toastify";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { storeSignature } from "./api";
import { SOLANA_RPC_HOST } from "../../helpers/solana-helpers/config";
import WinnerModal from "../../components/ui/WinnerModal";

export interface Winner {
  rewardId: number;
  rewardName: string;
  rewardType: string;
  mintAddress: string;
  amount: string;
  imageUrl: string;
  winnerId: number;
  winnerPubkey: string;
  ticketNumber: number;
  isClaimed: boolean;
  claimedAt: string | null;
}

export interface RaffleReward {
  id: number;
  raffleId: number;
  rewardType: number;
  rewardName: string;
  mintAddress: string;
  amount: string;
  imageUrl: string;
  metadataJson: string;
}

export interface RaffleType {
  id: number;
  title: string;
  description: string;
  image: string;
  price: number;
  tokenType: string;
  total: number;
  sold: number;
  winners: number;
  endTime: string;
  created: string;
  host: string;
  hostId: number;
  // hostReputation: number;
  isVerified: boolean;
  isFeatured: boolean;
  prizeValue: string;
  startDate?: string;
  endDate?: string;
  endedAt?: string;
  rewards?: RaffleReward[];
  winnersData?: Winner[];
  hasWinners?: boolean;
  winnersSelected?: boolean;
  participants?: string[];
  status?: number;
}

// Reward types mapping
const RAFFLE_REWARD_TYPES = {
  NFT: 0,
  SPL_TOKEN: 1,
  SPL_TOKEN_2022: 2,
};

const RAFFLE_STATUS = {
  UPCOMING: 1,
  LIVE: 2,
  ENDED: 3,
};

// Default fallback images
const DEFAULT_IMAGES = {
  NFT: "/images/default-nft.png",
  TOKEN: "/images/default-token.png",
};

const formatDateOnly = (dateStr: string) =>
  new Date(dateStr).toISOString().split("T")[0];

function formatCountdown(targetDateStr: string) {
  // const end = new Date(endDateStr).getTime();
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  let diff = target - now;
  // let diff = end - now;

  if (diff <= 0) return "Ended";

  const secondsInYear = 1000 * 60 * 60 * 24 * 365;
  const secondsInDay = 1000 * 60 * 60 * 24;
  const secondsInHour = 1000 * 60 * 60;
  const secondsInMinute = 1000 * 60;

  const years = Math.floor(diff / secondsInYear);
  diff %= secondsInYear;

  const days = Math.floor(diff / secondsInDay);
  diff %= secondsInDay;

  const hours = Math.floor(diff / secondsInHour);
  diff %= secondsInHour;

  const minutes = Math.floor(diff / secondsInMinute);
  diff %= secondsInMinute;

  const seconds = Math.floor(diff / 1000);

  if (years > 0) return `${years}y ${days}d ${hours}h`;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const RaffleDetail = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { slug } = useParams<{ slug: string }>();

  const raffleId = slug?.split("-").pop();

  const [raffle, setRaffle] = useState<RaffleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const [countdown, setCountdown] = useState<string>("");
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [nonWinnerBannerVisible, setNonWinnerBannerVisible] = useState(false);
  //const [raffleEndedFetched, setRaffleEndedFetched] = useState(false);
  const [hostPhotoUrl, setHostPhotoUrl] = useState<string | null>(null);
  const winners = raffle?.winnersData ?? [];
  const [nftImages, setNftImages] = useState<Record<string, string>>({});

  const TOKEN_MAP: Record<number, string> = {
    0: "SOL",
    1: "USDT",
    2: "BONK",
    3: "USDC",
  };

  const isNFTReward = (rewardType: number) =>
    rewardType === RAFFLE_REWARD_TYPES.NFT;

  const fetchNFTMetadata = useCallback(async (wallet: string) => {
    try {
      const res = await server.get(`/api/nfts/${wallet}`);
      if (!res.data.success) return;

      const nfts: any[] = res.data.data.nfts;
      const images: Record<string, string> = {};

      for (const nft of nfts) {
        try {
          if (!nft.uri) continue;
          const metadataRes = await fetch(nft.uri);
          if (!metadataRes.ok) continue;
          const metadata = await metadataRes.json();
          images[nft.mint] = metadata.image;
        } catch (err) {
          console.error("Failed to fetch NFT metadata for", nft.mint, err);
        }
      }
      setNftImages(images);
    } catch (err) {
      console.error("Failed to fetch NFTs:", err);
    }
  }, []);

  const getRewardImage = (reward: RaffleReward) => {
    if (isNFTReward(reward.rewardType) && reward.mintAddress) {
      return nftImages[reward.mintAddress] || DEFAULT_IMAGES.NFT;
    }
    if (
      reward.rewardType === RAFFLE_REWARD_TYPES.SPL_TOKEN ||
      reward.rewardType === RAFFLE_REWARD_TYPES.SPL_TOKEN_2022
    ) {
      return reward.imageUrl || DEFAULT_IMAGES.TOKEN;
    }
    return DEFAULT_IMAGES.TOKEN;
  };

  const handleBuyTickets = useCallback(async () => {
    if (!raffle) {
      toast.error("Raffle data not loaded");
      return;
    }

    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (ticketCount <= 0) {
      toast.error("Please select at least 1 ticket");
      return;
    }

    const now = new Date();
    const endDate = raffle.endDate ? new Date(raffle.endDate) : null;
    if (endDate && now > endDate) {
      toast.error("This raffle has ended");
      return;
    }

    if (raffle.sold + ticketCount > raffle.total) {
      toast.error("Not enough tickets available");
      return;
    }

    toast.info("Processing transaction. Please wait...");

    try {
      const transactionResponse = await server.post("/ticket/buy", {
        senderPubkey: publicKey.toBase58(),
        type: "solana",
        raffleId: raffle.id,
        ticketCount: ticketCount,
      });

      if (!transactionResponse.data.success) {
        throw new Error(
          transactionResponse.data.message || "Failed to create transaction",
        );
      }

      const { transaction } = transactionResponse.data.data;

      const solanaTransaction = Transaction.from(
        Buffer.from(transaction, "base64"),
      );

      const signedTransaction = await signTransaction(solanaTransaction);

      const connection = new Connection(SOLANA_RPC_HOST);

      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
      );

      const confirmResponse = await storeSignature(
        publicKey.toBase58(),
        signature,
        "load",
        transactionResponse?.data?.data?.lamports,
        transactionResponse?.data?.data?.commissionRate,
        transactionResponse?.data?.data?.commissionAmount,
        transactionResponse?.data?.data?.creatorAmount,
        transactionResponse?.data?.data?.isNFTHolder,
        "sol",
        ticketCount,
        raffle.id,
      );

      if (confirmResponse.success) {
        toast.success(`Successfully purchased ${ticketCount} ticket(s)!`);

        await fetchRaffle();
      } else {
        throw new Error(
          confirmResponse.data.message || "Failed to confirm purchase",
        );
      }
    } catch (error: any) {
      console.error("Transaction error:", error);

      if (error.message.includes("rejected")) {
        toast.error("Transaction was rejected by wallet");
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient balance");
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(error.message || "Transaction failed");
      }
    } finally {
      // setProcessing(false);
    }
  }, [raffle, ticketCount, publicKey, signTransaction, connected]);

  const fetchRaffle = useCallback(async () => {
    if (!raffleId) return;
    try {
      setLoading(true);
      const res = await server.get(`/raffle/${raffleId}`);
      if (res.data.success) {
        const data = res.data.data.raffle;

        const mappedRaffle: RaffleType = {
          id: data.id,
          title: data.title,
          description: data.description,
          image: data.imageUrl,
          price: Number(data.ticketPrice),
          tokenType: TOKEN_MAP[data.tokenType] || "UNKNOWN",
          // tokenTypeNumber: data.tokenType,
          total: data.totalTickets,
          sold: data.ticketsSold,
          winners: data.numberOfWinners,
          created: formatDateOnly(data.createdAt),
          host: res.data.data.userData.pubkey,
          hostId: res.data.data.userData.id,
          // hostReputation: data.userReputation || 100,
          isVerified: data.raffle_detail?.requiresNftVerification || false,
          isFeatured: data.raffle_detail?.isFeatured || false,
          prizeValue: (data.ticketPrice * data.totalTickets).toFixed(2),
          // tokenMint: data.tokenMint,
          startDate: data.startDate,
          endDate: data.endDate,
          endTime: "",
          endedAt: data.endedAt,
          rewards: data.raffle_rewards || [],
          winnersData: res.data.data.winners || [],
          hasWinners: res.data.data.hasWinners || false,
          winnersSelected: res.data.data.winnersSelected || false,
          participants: data.participants || [],
          status: data.status,
        };

        setRaffle(mappedRaffle);

        if (mappedRaffle.hostId) {
          try {
            const hostRes = await server.get(
              `/user/info/${mappedRaffle.hostId}`,
            );
            if (
              hostRes.data.success &&
              hostRes.data.data.user?.user_info?.photoUrl
            ) {
              setHostPhotoUrl(
                // `${server.defaults.baseURL}${hostRes.data.data.user.user_info.photoUrl}`
                hostRes.data.data.user.user_info.photoUrl,
              );
            }
          } catch (err) {
            console.error("Failed to fetch host photo:", err);
          }
        }
        // Fetch NFT metadata images if user won NFT
        if (publicKey) {
          const userWonNFT = mappedRaffle.winnersData?.some(
            (w) =>
              w.winnerPubkey === publicKey.toBase58() &&
              isNFTReward(Number(w.rewardType)),
          );
          if (userWonNFT) fetchNFTMetadata(publicKey.toBase58());
        }
      } else {
        toast.error(res.data.message || "Failed to fetch raffle");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to fetch raffle");
    } finally {
      setLoading(false);
    }
  }, [raffleId, fetchNFTMetadata, publicKey]);

  useEffect(() => {
    fetchRaffle();
  }, [fetchRaffle]);

  // Countdown logic
  useEffect(() => {
    if (!raffle) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Determine the target date based on status
      let targetDateStr: string | null = null;

      if (raffle.status === RAFFLE_STATUS.UPCOMING) {
        targetDateStr = raffle.startDate!;
      } else if (raffle.status === RAFFLE_STATUS.LIVE) {
        targetDateStr = raffle.endDate!;
      }

      if (!targetDateStr) return;

      const targetTime = new Date(targetDateStr).getTime();
      const remaining = targetTime - now;

      if (remaining <= 0) {
        if (raffle.status === RAFFLE_STATUS.UPCOMING) {
          // Automatically move to LIVE when start date is reached
          setRaffle((prev) =>
            prev ? { ...prev, status: RAFFLE_STATUS.LIVE } : prev,
          );
          setCountdown(formatCountdown(raffle.endDate!));
        } else if (raffle.status === RAFFLE_STATUS.LIVE) {
          // Automatically move to ENDED when end date is reached
          setRaffle((prev) =>
            prev ? { ...prev, status: RAFFLE_STATUS.ENDED } : prev,
          );
          setCountdown("Ended");
        }
      } else {
        setCountdown(formatCountdown(targetDateStr));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [raffle]);

  // Socket.IO integration for real-time updates
  useEffect(() => {
    if (!raffleId) return;

    const raffleIdNum = parseInt(raffleId);
    if (isNaN(raffleIdNum)) return;

    // Join raffle room for live updates
    socketService.joinRaffle(raffleIdNum);

    // Set up event listeners
    const handleRaffleUpdate = (data: any) => {
      // console.log("Raffle update received:", data);
      if (data.raffleId === raffleIdNum) {
        // console.log("Processing raffle update for current raffle:", data);
        setRaffle((prev) => {
          if (!prev) return prev;

          const updatedRaffle = {
            ...prev,
            sold: data.ticketsSold || prev.sold,
            total: data.totalTickets || prev.total,
          };

          // Handle reward claim updates
          if (data.rewardClaimed && prev.winnersData) {
            updatedRaffle.winnersData = prev.winnersData.map((winner) => {
              if (winner.rewardId === data.rewardClaimed.rewardId) {
                return {
                  ...winner,
                  isClaimed: data.rewardClaimed.isClaimed,
                  claimedAt: data.rewardClaimed.claimedAt,
                };
              }
              return winner;
            });
          }

          return updatedRaffle;
        });
      }
    };

    const handleTicketPurchase = (data: any) => {
      // console.log("Ticket purchase received:", data);
      if (data.raffleId === raffleIdNum) {
        // console.log("Processing ticket purchase for current raffle:", data);
        setRaffle((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sold: data.ticketsSold,
            total: data.totalTickets || prev.total,
          };
        });
        // Show toast for other users (not the buyer)
        if (publicKey && data.buyerPubkey !== publicKey.toBase58()) {
          toast.info(
            `${data.ticketCount} ticket(s) purchased! ${data.ticketsLeft} left`,
          );
        }
      }
    };

    const handleRaffleStatusChange = (data: any) => {
      if (data.raffleId === raffleIdNum) {
        // console.log("Raffle status changed:", data);
        if (data.newStatus === "ENDED") {
          // Only show toast to users who have tickets in this raffle
          if (
            publicKey &&
            raffle?.participants?.includes(publicKey.toBase58())
          ) {
            toast.info(
              `Raffle has ended! ${
                data.reason === "sold_out"
                  ? "All tickets sold!"
                  : "Time expired!"
              }`,
            );
          }
          fetchRaffle(); // Refresh to get latest data
        }
      }
    };

    const handleWinnersSelected = (data: any) => {
      if (data.raffleId === raffleIdNum) {
        // console.log("Winners selected:", data);
        // Only show toast to users who have tickets in this raffle
        if (publicKey && raffle?.participants?.includes(publicKey.toBase58())) {
          toast.success(
            `Winners have been selected! ${data.numberOfWinners} winner(s)`,
          );
        }
        fetchRaffle(); // Refresh to show winners
      }
    };

    // Register event listeners
    socketService.onRaffleUpdate(handleRaffleUpdate);
    socketService.onTicketPurchase(handleTicketPurchase);
    socketService.onRaffleStatusChanged(handleRaffleStatusChange);
    socketService.onWinnersSelected(handleWinnersSelected);

    // Cleanup on unmount
    return () => {
      socketService.leaveRaffle(raffleIdNum);
      socketService.offRaffleUpdate(handleRaffleUpdate);
      socketService.offTicketPurchase(handleTicketPurchase);
      socketService.offRaffleStatusChanged(handleRaffleStatusChange);
      socketService.offWinnersSelected(handleWinnersSelected);
    };
  }, [raffleId, publicKey, fetchRaffle]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!raffle || !publicKey || !raffle.endedAt) return;

    const key = `raffle-${raffle.id}-result-seen`;
    if (localStorage.getItem(key)) return;

    const user = publicKey.toBase58();

    // Check if user participated
    const participated = raffle.participants?.includes(user) || raffle.sold > 0;

    if (!participated) return;

    // Check if user won
    const userRewards = raffle.winnersData?.filter(
      (w) => w.winnerPubkey === user,
    );
    const isWinner = (userRewards?.length ?? 0) > 0;

    if (isWinner) {
      const allClaimed = userRewards!.every((r) => r.isClaimed);
      if (!allClaimed) setWinnerModalVisible(true);
    } else {
      // Not a winner → show banner
      setNonWinnerBannerVisible(true);
    }
  }, [raffle, publicKey]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading raffle details...
      </div>
    );

  if (!raffle)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Raffle not found.
      </div>
    );

  const ticketsLeft = Math.max(raffle.total - raffle.sold, 0);
  // const totalCost = raffle.price * ticketCount;
  const totalCost = Number((raffle.price * ticketCount).toPrecision(12));

  const isUpcoming = raffle.status === RAFFLE_STATUS.UPCOMING;
  const isLive = raffle.status === RAFFLE_STATUS.LIVE;
  const isEnded = raffle.status === RAFFLE_STATUS.ENDED || !!raffle.endedAt;
  //const isEnded = countdown === "Ended" || !!raffle.endedAt;
  const isSoldOut = raffle.total - raffle.sold <= 0;

  const countdownTarget = isUpcoming
    ? raffle.startDate
    : isLive
      ? raffle.endDate
      : null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      {/* Winner Modal */}
      {winnerModalVisible && publicKey && (
        <WinnerModal
          raffle={raffle}
          publicKey={publicKey.toBase58()}
          onClose={() => {
            localStorage.setItem(`raffle-${raffle.id}-result-seen`, "true");
            setWinnerModalVisible(false);
          }}
        />
      )}

      {/* Non-winner Banner */}
      {nonWinnerBannerVisible && (
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 bg-yellow-50 border border-yellow-300 text-yellow-900 p-4 rounded mb-4">
          <p className="text-sm sm:text-base">
            You didn’t win this time — thanks for participating. Better luck
            next time 🍀
          </p>
          <button
            onClick={() => {
              localStorage.setItem(`raffle-${raffle.id}-result-seen`, "true");
              setNonWinnerBannerVisible(false);
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 overflow-hidden">
            <div className="relative aspect-video">
              <img
                src={raffle.image}
                alt={raffle.title}
                className="w-full h-full object-cover"
              />
              {raffle.isVerified && (
                <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                  <CheckCircle size={16} /> Verified Collection
                </div>
              )}
            </div>
          </Card>

          {/* Raffle Info */}
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div>
              <div className="top-3 left-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white mb-3">
                Featured Raffle
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gradient break-words">
                {raffle.title}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {raffle.description}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 sm:pt-4 border-t border-border/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Prize Value</span>
                </div>
                <p className="font-bold text-base sm:text-lg truncate">
                  ~{raffle.prizeValue}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  Winners
                </div>
                <p className="font-bold text-base sm:text-lg">
                  {raffle.winners}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  Created
                </div>
                <p className="font-bold text-base sm:text-lg">
                  {raffle.created}
                </p>
              </div>
              {/* <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Reputation
                </div>
                <p className="font-bold text-base sm:text-lg">
                  {raffle.hostReputation}%
                </p>
              </div> */}
            </div>
          </Card>

          {/* Reward Section */}
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-bold">Rewards</h2>

            {raffle.rewards && raffle.rewards.length > 0 ? (
              <>
                <div className="space-y-3 sm:space-y-4">
                  {(showAllRewards
                    ? raffle.rewards
                    : raffle.rewards.slice(0, 3)
                  ).map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center gap-3 sm:gap-6 bg-card/40 border border-border/40 rounded-lg p-3 sm:p-4"
                    >
                      <img
                        src={getRewardImage(reward)}
                        alt={reward.rewardName}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate sm:whitespace-normal sm:break-words">
                          {reward.rewardName}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Amount: {parseFloat(reward.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="sm:hidden">
                            Mint: {reward.mintAddress.slice(0, 4)}…
                            {reward.mintAddress.slice(-4)}
                          </span>
                          <span className="hidden sm:inline break-all">
                            Mint: {reward.mintAddress}
                          </span>
                        </p>
                        <a
                          href={`https://solscan.io/token/${reward.mintAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline inline-block mt-0.5"
                        >
                          View on Solscan
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                {raffle.rewards.length > 3 && (
                  <Button
                    variant="ghost"
                    className="text-sm text-primary px-0"
                    onClick={() => setShowAllRewards(!showAllRewards)}
                  >
                    {showAllRewards
                      ? "Show less"
                      : `Show all rewards (${raffle.rewards.length})`}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Reward details not available.
              </p>
            )}
          </Card>

          {/* 🏆 WINNERS SECTION */}
          {/* Winners Section - Show if raffle has ended (manually or naturally) and winners are selected */}
          {(raffle.endedAt ||
            (raffle.endDate && new Date() > new Date(raffle.endDate))) &&
            raffle.winnersSelected &&
            winners.length > 0 && (
              <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                  Winners
                </h2>

                <div className="space-y-2 sm:space-y-3">
                  {winners.map((winner, index) => (
                    <div
                      key={winner.rewardId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 border border-border/40 rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {winner.imageUrl && (
                          <img
                            src={winner.imageUrl}
                            alt={winner.rewardName}
                            className="w-10 h-10 rounded-md object-cover shrink-0"
                          />
                        )}

                        <div className="flex flex-col">
                          <span className="font-semibold text-xs sm:text-sm">
                            Winner #{index + 1}
                          </span>
                          <button
                            onClick={() => copyToClipboard(winner.winnerPubkey)}
                            className="flex items-center gap-1 text-left text-xs text-muted-foreground hover:text-primary transition group"
                          >
                            {/* Mobile (short) */}
                            <span className="sm:hidden">
                              {winner.winnerPubkey.slice(0, 4)}…
                              {winner.winnerPubkey.slice(-4)}
                            </span>

                            {/* Desktop (full) */}
                            <span className="hidden sm:block break-all">
                              {winner.winnerPubkey}
                            </span>

                            <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                          </button>

                          <span className="text-xs text-muted-foreground">
                            Ticket #{winner.ticketNumber}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-sm font-medium block">
                          {winner.rewardName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Amount: {parseFloat(winner.amount)}
                        </span>
                        {winner.isClaimed && (
                          <div className="text-xs text-green-500 mt-1">
                            ✓ Claimed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          {/* )} */}

          {/* Host Section */}
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className="text-base sm:text-lg font-bold">Hosted By</h2>
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4">
                {hostPhotoUrl ? (
                  <img
                    src={hostPhotoUrl}
                    alt="Host"
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-full flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="sm:hidden">
                    {raffle.host.slice(0, 4)}…{raffle.host.slice(-4)}
                  </span>
                  <span className="hidden sm:inline break-all">
                    {raffle.host}
                  </span>
                  {/* <p className="text-xs sm:text-sm text-muted-foreground">
                    {raffle.hostReputation}% positive rating
                  </p> */}
                </div>
              </div>
              <div className="relative z-10 shrink-0">
                <HostProfilePopover hostId={raffle.hostId} />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT SIDE (Sidebar) */}
        <div className="lg:col-span-1">
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-4 sm:p-6 space-y-3 sm:space-y-4 lg:sticky lg:top-24">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Enter Raffle</h3>
            </div>
            {/* Ticket Progress */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">
                    {raffle.sold} / {raffle.total} tickets sold
                  </span>
                </div>

                {isLive && !isSoldOut && (
                  <span className="text-accent font-semibold text-xs sm:text-sm shrink-0">
                    {ticketsLeft} left
                  </span>
                )}
              </div>
              <Progress
                value={(raffle.sold / raffle.total) * 100}
                className="h-2 sm:h-3"
              />
            </div>

            {/* Ticket Price */}
            <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl border border-border/50 p-3 sm:p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Ticket Price
                </span>
              </div>
              <span className="text-lg sm:text-xl font-bold">
                {raffle.price} {raffle.tokenType}
              </span>
            </div>

            {/* remaining time */}

            <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl border border-border/50 p-3 sm:p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {isUpcoming ? "Starts In" : "Ends In"}
                </span>
              </div>
              <span className="text-muted-foreground text-lg sm:text-xl font-bold">
                {raffle.status === RAFFLE_STATUS.ENDED ? "Ended" : countdown}
              </span>
            </div>

            {/* Countdown */}
            {isLive && !isSoldOut && (
              <div className="space-y-2 sm:space-y-3">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Number of Tickets
                </label>
                <div className="flex items-center gap-2 sm:gap-3 mt-2">
                  <Button
                    variant="outline"
                    className="bg-background-50 h-9 w-9 sm:h-10 sm:w-10"
                    size="icon"
                    onClick={() =>
                      setTicketCount((prev) => Math.max(1, prev - 1))
                    }
                    disabled={!connected || ticketsLeft === 0}
                  >
                    -
                  </Button>
                  <input
                    type="number"
                    value={ticketCount}
                    min={1}
                    max={ticketsLeft}
                    onChange={(e) => {
                      const value = Number(e.target.value);

                      if (Number.isNaN(value)) return;

                      setTicketCount(Math.min(Math.max(1, value), ticketsLeft));
                    }}
                    className="flex h-9 sm:h-10 w-full rounded-md text-center border border-border bg-background-50 text-base sm:text-lg p-2 font-bold focus:ring-offset-2"
                    disabled={!connected || ticketsLeft === 0}
                  />
                  <Button
                    variant="outline"
                    className="bg-background-50 h-9 w-9 sm:h-10 sm:w-10"
                    size="icon"
                    onClick={() =>
                      setTicketCount((prev) => Math.min(prev + 1, ticketsLeft))
                    }
                    disabled={
                      ticketCount >= ticketsLeft ||
                      !connected ||
                      ticketsLeft === 0
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            )}
            {/* Total Cost */}
            {isLive && !isSoldOut && (
              <div className="flex items-center bg-card/50 backdrop-blur-xl border border-border/50 justify-between p-3 sm:p-4 rounded-lg bg-primary-10 border-primary/30">
                <span className="font-semibold text-xs sm:text-sm text-muted-foreground">
                  Total Cost
                </span>
                <span className="text-xl sm:text-2xl font-bold text-primary">
                  {totalCost} {raffle.tokenType}
                </span>
              </div>
            )}

            {/* Buy Button */}
            {/* {isEnded ? (
              <div className="w-full h-10 sm:h-12 flex items-center justify-center rounded-lg bg-muted text-muted-foreground font-semibold text-sm sm:text-base mt-4">
                Raffle Ended
              </div>
            ) : isSoldOut ? (
              <div className="w-full h-10 sm:h-12 flex items-center justify-center rounded-lg bg-muted text-muted-foreground font-semibold text-sm sm:text-base mt-4">
                Sold Out
              </div>
            ) : (
              <Button
                className="w-full gradient-primary glow-primary h-10 sm:h-12 text-base sm:text-lg mt-4"
                onClick={handleBuyTickets}
                disabled={!connected}
              >
                <Ticket className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Buy {ticketCount} Ticket{ticketCount > 1 ? "s" : ""}
              </Button>
            )} */}
            {isUpcoming ? (
              // <div className="w-full h-10 sm:h-12 flex items-center justify-center rounded-lg bg-muted text-muted-foreground font-semibold text-sm sm:text-base mt-4">
              //   Raffle has not started yet
              // </div>
              <div className="w-full h-10 sm:h-12 flex items-center justify-center gap-2 rounded-lg bg-yellow-50 border border-border/50 text-yellow-800 font-semibold text-sm sm:text-base mt-4">
                <Clock className="h-4 w-4" />
                Raffle starts soon
              </div>
            ) : isEnded ? (
              <div className="w-full h-10 sm:h-12 flex items-center justify-center rounded-lg bg-muted text-muted-foreground font-semibold text-sm sm:text-base mt-4">
                Raffle Ended
              </div>
            ) : isSoldOut ? (
              <div className="w-full h-10 sm:h-12 flex items-center justify-center rounded-lg bg-muted text-muted-foreground font-semibold text-sm sm:text-base mt-4">
                Sold Out
              </div>
            ) : (
              <Button
                className="w-full gradient-primary glow-primary h-10 sm:h-12 text-base sm:text-lg mt-4"
                onClick={handleBuyTickets}
                disabled={!connected}
              >
                <Ticket className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Buy {ticketCount} Ticket{ticketCount > 1 ? "s" : ""}
              </Button>
            )}

            {/* Info */}
            <div className="bg-card/50 backdrop-blur-xl border border-accent/30 rounded-lg flex gap-2 sm:gap-3 p-3 sm:p-4">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-semibold">NFT Holder Discount</p>
                <p className="text-muted-foreground">
                  Connect a wallet with verified NFTs to get 2.5% fees instead
                  of 5%
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default RaffleDetail;
