import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Progress } from "../../components/ui/Progress";
import Button from "../../components/ui/Button";
import HostProfilePopover from "../../components/ui/HostProfilePopover";
import { TokenDisplay } from "../../components/ui/TokenDisplay";
import { RewardAmountDisplay } from "../../components/ui/RewardAmountDisplay";
import socketService from "../../services/socket.service";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";

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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import server, { getRequest } from "../../config/server";
import { toast } from "react-toastify";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { storeSignature, cancelReservation } from "./api";
import { SOLANA_RPC_HOST } from "../../helpers/solana-helpers/config";
import WinnerModal from "../../components/ui/WinnerModal";
import { shortenPubkey } from "../../helpers/utils";

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
  //prizeValue: string;
  startDate?: string;
  endDate?: string;
  endedAt?: string;
  rewards?: RaffleReward[];
  winnersData?: Winner[];
  hasWinners?: boolean;
  winnersSelected?: boolean;
  purchaserUserIds?: number[];

  //participants?: string[];
  status?: number;
  tokenTypeNumber?: number;
  tokenAddress?: string;
}

type TTicketPurchaser = {
  userPubkey: string;
  userId: number;
  ticketCount: number;
};

type TPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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
  NFT: "/uploads/nft-placeholder.svg",
  TOKEN: "/uploads/token-placeholder.png",
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

const isInsufficientFundsError = (error: any) => {
  const message =
    error?.message ||
    error?.toString?.() ||
    error?.response?.data?.message ||
    "";

  return (
    message.includes("insufficient") ||
    message.includes("Attempt to debit") ||
    message.includes("InsufficientFunds") ||
    message.includes("0 lamports")
  );
};

const RaffleDetail = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { slug } = useParams<{ slug: string }>();

  const raffleId = slug?.split("-").pop();

  const [raffle, setRaffle] = useState<RaffleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const [countdown, setCountdown] = useState<string>("");
  const [showAllRewards, setShowAllRewards] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [nonWinnerBannerVisible, setNonWinnerBannerVisible] = useState(false);
  //const [raffleEndedFetched, setRaffleEndedFetched] = useState(false);
  const [hostPhotoUrl, setHostPhotoUrl] = useState<string | null>(null);
  const winners = raffle?.winnersData ?? [];
  // const [nftImages, setNftImages] = useState<Record<string, string>>({});
  const [isBuying, setIsBuying] = useState(false);
  const user = useSelector((state: RootState) => state.user);
  const [ticketPurchasers, setTicketPurchasers] = useState<TTicketPurchaser[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<TPagination | null>(null);

  const extractErrorMessage = (error: any): string => {
    if (!error) return "";

    if (typeof error === "string") return error;

    if (error.message) return error.message;

    if (error.error?.message) return error.error.message;

    if (error.error?.data?.err) return error.error.data.err;

    try {
      return JSON.stringify(error);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const fetchTicketPurchasers = async () => {
      try {
        const res = await server.get(`/ticket/purchasers/${raffleId}/${page}`);
        if (res?.data?.success) {
          setTicketPurchasers(res.data.data.buyers || []);
          setPagination(res.data.data.pagination);
        } else {
          setTicketPurchasers([]);
          toast.error(res.data.message || "Error fetching purchased tickets");
        }
      } catch (error) {
        setTicketPurchasers([]);
        toast.error("Error fetching ticket purchasers");
      }
    };

    fetchTicketPurchasers();
  }, [raffleId, page]);

  const getRewardImage = (reward: RaffleReward) => {
    if (reward.imageUrl) return reward.imageUrl;

    if (reward.rewardType === RAFFLE_REWARD_TYPES.NFT) {
      return DEFAULT_IMAGES.NFT;
    }

    return DEFAULT_IMAGES.TOKEN;
  };

  const getTokenTypeForAPI = (
    tokenTypeNumber: number,
    tokenAddress?: string,
  ): string => {
    switch (tokenTypeNumber) {
      case 0:
        return "solana";
      case 3: // USDC
        return "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      case 1: // SPL_TOKEN
      case 2: // SPL_TOKEN_2022
        if (tokenAddress) {
          return tokenAddress;
        }
        console.warn(
          `Token type ${tokenTypeNumber} requires token address but none provided`,
        );
        return "solana"; // Fallback to prevent errors
      default:
        console.warn(`Unknown token type: ${tokenTypeNumber}`);
        return "solana";
    }
  };

  const handleBuyTickets = useCallback(async () => {
    if (isBuying) return;
    if (!raffle) {
      toast.error("Raffle data not loaded");
      return;
    }

    if (!user.isAuthenticated) {
      toast.error("Please sign in to purchase tickets");
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
    const connection = new Connection(SOLANA_RPC_HOST);
    const balance = await connection.getBalance(publicKey);

    if (balance === 0) {
      toast.error(
        "Insufficient balance. Please add SOL to your wallet to buy tickets.",
      );
      setIsBuying(false);
      return;
    }

    setIsBuying(true);
    let reservationId: string | null = null;
    try {
      toast.info("Reserving tickets. Please wait...");
      // Step 1: Reserve tickets (this prevents race conditions)
      const transactionResponse = await server.post("/ticket/buy", {
        senderPubkey: publicKey.toBase58(),
        type: getTokenTypeForAPI(raffle.tokenTypeNumber, raffle.tokenAddress),
        raffleId: raffle.id,
        ticketCount: ticketCount,
      });

      if (!transactionResponse.data.success) {
        throw new Error(
          transactionResponse.data.message || "Failed to reserve tickets",
        );
      }

      const {
        transaction,
        reservationId: resId,
        reservationExpiresAt,
        reservationTimeoutSeconds,
      } = transactionResponse.data.data;

      reservationId = resId;

      // Show reservation countdown
      toast.info(
        `Tickets reserved! You have ${reservationTimeoutSeconds} seconds to complete the transaction.`,
        { autoClose: 3000 },
      );

      // Small delay so user sees the toast first
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Step 2: Sign transaction
      const solanaTransaction = Transaction.from(
        Buffer.from(transaction, "base64"),
      );

      const signedTransaction = await signTransaction(solanaTransaction);

      // Step 3: Submit transaction to Solana
      const connection = new Connection(SOLANA_RPC_HOST);

      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
      );

      // Step 4: Confirm reservation with signature
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
        reservationId, // Pass reservation ID
        reservationId, // Pass reservation ID
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

      // Cancel reservation if transaction failed
      if (reservationId) {
        try {
          await cancelReservation(reservationId);
        } catch (cancelError) {
          console.error("Failed to cancel reservation:", cancelError);
        }
      }

      if (error.message.includes("rejected")) {
        toast.error("Transaction was rejected by wallet");
      } else if (error.message.includes("blockhash")) {
        toast.error("Transaction Expired. Please try again.");
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient balance");
      } else if (error.message.includes("EXISTING_RESERVATION")) {
        toast.error("You already have an active reservation for this raffle");

        if (isInsufficientFundsError(error)) {
          toast.error(
            "Insufficient balance. Please add funds to your wallet and try again.",
          );
          return;
        }

        if (error?.response?.data?.message) {
          toast.error(error.response.data.message);
          return;
        }

        toast.error("Transaction failed. Please try again.");
      }
    } finally {
      setIsBuying(false);
    }
  }, [
    raffle,
    ticketCount,
    publicKey,
    signTransaction,
    connected,
    isBuying,
    user.isAuthenticated,
  ]);

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
          tokenType: mapNumericTokenType(data.tokenType),
          tokenTypeNumber: data.tokenType,
          tokenAddress: data.tokenAddress,
          total: data.totalTickets,
          sold: data.ticketsSold,
          winners: data.numberOfWinners,
          created: formatDateOnly(data.createdAt),
          host: res.data.data.userData.pubkey,
          hostId: res.data.data.userData.id,
          // hostReputation: data.userReputation || 100,
          isVerified: data.raffle_detail?.requiresNftVerification || false,
          isFeatured: data.raffle_detail?.isFeatured || false,
          // prizeValue: (data.ticketPrice * data.totalTickets).toFixed(2),
          // tokenMint: data.tokenMint,
          startDate: data.startDate,
          endDate: data.endDate,
          endTime: "",
          endedAt: data.endedAt,
          rewards: data.raffle_rewards || [],
          winnersData: res.data.data.winners || [],
          hasWinners: res.data.data.hasWinners || false,
          winnersSelected: res.data.data.winnersSelected || false,
          // participants: data.participants || [],
          purchaserUserIds: res.data.data.purchaserUserIds || [],

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
      } else {
        toast.error(res.data.message || "Failed to fetch raffle");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to fetch raffle");
    } finally {
      setLoading(false);
    }
  }, [raffleId, publicKey]);

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
      if (data.raffleId === raffleIdNum) {
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
      if (data.raffleId === raffleIdNum) {
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
        if (data.newStatus === "ENDED") {
          if (
            publicKey &&
            user?.id &&
            raffle?.purchaserUserIds?.includes(user.id)
          ) {
            toast.info(
              `Raffle has ended! ${
                data.reason === "sold_out"
                  ? "All tickets sold!"
                  : "Time expired!"
              }`,
            );
          }

          fetchRaffle();
        }
      }
    };

    const handleWinnersSelected = (data: any) => {
      if (data.raffleId === raffleIdNum) {
        const participated =
          user?.id && raffle?.purchaserUserIds?.includes(user.id);

        if (participated) {
          toast.success(
            `Winners have been selected! ${data.numberOfWinners} winner(s)`,
          );
        }

        fetchRaffle();
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
    if (!raffle || !publicKey || !raffle.winnersSelected || !user?.id) return;

    const key = `raffle-${raffle.id}-result-seen`;
    if (localStorage.getItem(key)) return;

    const participated = raffle.purchaserUserIds?.includes(user.id);
    if (!participated) return;

    const userRewards = raffle.winnersData?.filter(
      (w) => w.winnerPubkey === publicKey.toBase58(),
    );

    const isWinner = (userRewards?.length ?? 0) > 0;

    if (isWinner) {
      const allClaimed = userRewards!.every((r) => r.isClaimed);
      if (!allClaimed) setWinnerModalVisible(true);
    } else {
      setNonWinnerBannerVisible(true);
    }
  }, [raffle, publicKey, user]);

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
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 overflow-hidden rounded-none">
            {(() => {
              const rewardImages = raffle.rewards
                ?.map((r) => r.imageUrl)
                .filter(Boolean) as string[];
              const heroImages =
                rewardImages && rewardImages.length > 0
                  ? rewardImages
                  : [raffle.image];
              return (
                <div className="relative">
                  <img
                    src={heroImages[heroIndex] || raffle.image}
                    alt={raffle.title}
                    className=" w-full h-full object-contain"
                  />

                  {/* Prev / Next arrows — only when multiple images */}
                  {heroImages.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setHeroIndex(
                            (i) =>
                              (i - 1 + heroImages.length) % heroImages.length,
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          setHeroIndex((i) => (i + 1) % heroImages.length)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>

                      {/* Dot indicators */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {heroImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setHeroIndex(i)}
                            className={`transition-all ${
                              i === heroIndex
                                ? "w-4 h-2 bg-white"
                                : "w-2 h-2 bg-white/50 hover:bg-white/80"
                            }`}
                            aria-label={`Go to image ${i + 1}`}
                          />
                        ))}
                      </div>

                      {/* Counter badge */}
                      <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                        {heroIndex + 1} / {heroImages.length}
                      </div>
                    </>
                  )}

                  {raffle.isVerified && (
                    <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                      <CheckCircle size={16} /> Verified Collection
                    </div>
                  )}
                </div>
              );
            })()}
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
            <div className="grid grid-cols-2 sm:grid-cols-2 pt-3 sm:pt-4 border-t border-border/50">
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
                        onError={(e) => {
                          e.currentTarget.src =
                            reward.rewardType === RAFFLE_REWARD_TYPES.NFT
                              ? DEFAULT_IMAGES.NFT
                              : DEFAULT_IMAGES.TOKEN;
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate sm:whitespace-normal sm:break-words">
                          {reward.rewardName}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <RewardAmountDisplay
                            amount={reward.amount}
                            rewardType={reward.rewardType}
                            mintAddress={reward.mintAddress}
                          />
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
                      className="flex gap-3 flex-row items-center justify-between bg-card/40 border border-border/40 rounded-lg p-3 sm:p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="font-semibold text-xs sm:text-sm">
                            Winner #{index + 1}
                          </span>
                          <button
                            onClick={() => copyToClipboard(winner.winnerPubkey)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition group"
                          >
                            {/* Mobile (short) */}
                            <span className="sm:hidden">
                              {winner.winnerPubkey.slice(0, 4)}…
                              {winner.winnerPubkey.slice(-4)}
                            </span>

                            {/* Desktop (full) */}
                            <span className="hidden sm:block">
                              {winner.winnerPubkey}
                            </span>

                            <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                          </button>

                          <span className="text-xs text-muted-foreground">
                            Ticket #{winner.ticketNumber}
                          </span>
                        </div>
                      </div>

                      {/* <div className="text-left sm:text-right"> */}

                      <div className="flex items-start gap-3 justify-end">
                        {winner.imageUrl && (
                          <img
                            src={winner.imageUrl}
                            alt={winner.rewardName}
                            className="w-12 h-12 rounded-md object-cover shrink-0"
                          />
                        )}
                        {/* Reward details */}
                        <div className="flex flex-col text-left">
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
                  <button
                    onClick={() => copyToClipboard(raffle.host)}
                    className="hover:text-primary transition cursor-pointer"
                  >
                    {/* Mobile (short) */}
                    <span className="sm:hidden">
                      {raffle.host.slice(0, 4)}…{raffle.host.slice(-4)}
                    </span>

                    {/* Desktop (full) */}
                    <span className="hidden sm:inline break-all">
                      {raffle.host}
                    </span>
                  </button>
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
                  <Ticket className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
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
                <TokenDisplay
                  amount={raffle.price}
                  tokenType={raffle.tokenType}
                  tokenAddress={raffle.tokenAddress}
                />
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
            {(!connected || !user.isAuthenticated) && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 sm:p-4 mb-4">
                <div className="flex gap-2 sm:gap-3">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-red-800">
                    <p className="font-semibold mb-1">Sign In Required</p>
                    <p>
                      You must sign in and connect your wallet to purchase
                      tickets.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLive && !isSoldOut && connected && user.isAuthenticated && (
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={ticketCount === 0 ? "" : ticketCount}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setTicketCount((prev) =>
                          Math.min((prev || 1) + 1, ticketsLeft),
                        );
                      }

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setTicketCount((prev) => Math.max((prev || 1) - 1, 1));
                      }
                    }}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      const numeric = Number(onlyDigits);

                      if (onlyDigits === "") {
                        setTicketCount(0);
                        return;
                      }

                      setTicketCount(
                        Math.min(Math.max(1, numeric), ticketsLeft),
                      );
                    }}
                    onBlur={() => {
                      setTicketCount((prev) =>
                        Math.min(Math.max(1, prev), ticketsLeft),
                      );
                    }}
                    className="flex h-9 sm:h-10 w-full rounded-md text-center border border-border bg-background-50 text-base sm:text-lg p-2 font-bold"
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
                  <TokenDisplay
                    amount={totalCost}
                    tokenType={raffle.tokenType}
                    tokenAddress={raffle.tokenAddress}
                    className="text-xl sm:text-2xl font-bold text-primary"
                  />
                </span>
              </div>
            )}

            {!connected || !user.isAuthenticated ? (
              <Button
                className="w-full h-10 sm:h-12 text-base sm:text-lg mt-4"
                disabled
              >
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Sign In to Buy
              </Button>
            ) : isUpcoming ? (
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
                disabled={!connected || !user.isAuthenticated || isBuying}
              >
                {isBuying ? (
                  "Processing..."
                ) : (
                  <>
                    <Ticket className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Buy {ticketCount} Ticket{ticketCount > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}

            {/* Info */}
            <div className="bg-card/50 backdrop-blur-xl border border-accent/30 rounded-lg flex gap-2 sm:gap-3 p-3 sm:p-4">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-semibold">NFT Holder Discount</p>
                <p className="text-muted-foreground">
                  Connect a wallet with any The Fox Club NFTs to get 2.5% fees
                  instead of 5%
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex flex-row gap-2 mt-4 ">
          <Ticket className="text-secondary mt-1" />
          <h2 className="text-2xl text-left font-bold text-secondary">
            Tickets Sold
          </h2>
        </div>
        <div className="relative overflow-x-auto w-full bg-neutral-primary-soft shadow-md rounded-lg border border-secondary mt-2">
          <table className="min-w-full w-full text-sm text-left text-gray-700">
            <thead className=" uppercase text-white tracking-wider">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-lg font-semibold text-primary"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-lg font-semibold text-right text-primary"
                >
                  Tickets Bought
                </th>
              </tr>
            </thead>
            <tbody>
              {ticketPurchasers && ticketPurchasers.length > 0 ? (
                ticketPurchasers.map((item, key) => (
                  <tr key={key} className="border border-bottom">
                    <th
                      scope="row"
                      className="px-6 py-4 text-white font-medium whitespace-nowrap flex items-center"
                    >
                      <span
                        className="font-bold text-lg truncate cursor-pointer hover:text-primary transition mr-2"
                        title={item.userPubkey} // full pubkey on hover
                      >
                        {shortenPubkey(item.userPubkey)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.userPubkey)}
                        title="Click to copy wallet address"
                        className="p-1 rounded-full transition"
                      >
                        <Copy width={16} height={16} />
                      </button>
                    </th>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {item.ticketCount}
                    </td>
                  </tr>
                ))
              ) : (
                <div className="p-4">
                  <span className="text-center py-4 text-gray-500 italic font-bold">
                    No Tickets Data
                  </span>
                </div>
              )}
            </tbody>
          </table>
          {pagination && pagination.totalPages >= 1 && (
            <div className="flex items-center justify-center gap-2 my-4">
              {/* Prev */}
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded-md bg-white/10 text-white disabled:opacity-40"
              >
                Prev
              </button>

              {/* Page Numbers */}
              {[...Array(pagination.totalPages)].map((_, i) => {
                const pageNumber = i + 1;

                return (
                  <button
                    key={i}
                    onClick={() => setPage(pageNumber)}
                    className={`px-3 py-1 rounded-md transition ${
                      page === pageNumber
                        ? "bg-secondary text-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              {/* Next */}
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-md bg-white/10 text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default RaffleDetail;
