import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Progress } from "../../components/ui/Progress";
import Button from "../../components/ui/Button";
import HostProfilePopover from "../../components/ui/HostProfilePopover";

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
} from "lucide-react";
// import { allRaffle } from "../../dummydata/mockRaffleDetail";
// import type { RaffleType } from "../../dummydata/mockRaffleDetail";
import server from "../../config/server";
import { toast } from "react-toastify";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { storeSignature } from "./api";
import { SOLANA_RPC_HOST } from "../../helpers/solana-helpers/config";

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
  hostReputation: number;
  isVerified: boolean;
  isFeatured: boolean;
  prizeValue: string;
  endDate?: string;
  endedAt?: string;
}

function formatDateOnly(dateStr: string) {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}

function formatCountdown(endDateStr: string) {
  const end = new Date(endDateStr).getTime();
  const now = Date.now();
  let diff = end - now;

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
  const { id } = useParams<{ id: string }>();

  const [raffle, setRaffle] = useState<RaffleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const [countdown, setCountdown] = useState<string>("");
  const TOKEN_MAP: Record<number, string> = {
    0: "SOL",
    1: "USDT",
    2: "BONK",
    3: "USDC",
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
          transactionResponse.data.message || "Failed to create transaction"
        );
      }

      const { transaction } = transactionResponse.data.data;

      const solanaTransaction = Transaction.from(
        Buffer.from(transaction, "base64")
      );

      const signedTransaction = await signTransaction(solanaTransaction);

      const connection = new Connection(SOLANA_RPC_HOST);

      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
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
        raffle.id
      );

      if (confirmResponse.success) {
        toast.success(`Successfully purchased ${ticketCount} ticket(s)!`);

        await fetchRaffle();
      } else {
        throw new Error(
          confirmResponse.data.message || "Failed to confirm purchase"
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
    if (!id) return;
    try {
      setLoading(true);
      const res = await server.get(`/raffle/${id}`);
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
          hostReputation: data.userReputation || 100,
          isVerified: data.raffle_detail?.requiresNftVerification || false,
          isFeatured: data.raffle_detail?.isFeatured || false,
          prizeValue: (data.ticketPrice * data.totalTickets).toFixed(2),
          // tokenMint: data.tokenMint,
          endDate: data.endDate,
          endTime: "",
          endedAt: data.endedAt,
        };

        setRaffle(mappedRaffle);
      } else {
        toast.error(res.data.message || "Failed to fetch raffle");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to fetch raffle");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!raffle?.endDate) return;

    const updateCountdown = () => {
      const timeStr = formatCountdown(
        raffle.endedAt ? raffle.endedAt : raffle.endDate!
      );
      setCountdown(timeStr);
    };

    updateCountdown(); // initialize immediately
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [raffle?.endDate]);

  useEffect(() => {
    fetchRaffle();
  }, [fetchRaffle]);

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
  const totalCost = (raffle.price * ticketCount).toFixed(2);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 space-y-4">
            <div>
              <div className="top-3 left-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white mb-3">
                Featured Raffle
              </div>
              <h1 className="text-3xl font-bold mb-4 text-gradient">
                {raffle.title}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {raffle.description}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Trophy className="h-4 w-4" />
                  Prize Value
                </div>
                <p className="font-bold text-lg">~{raffle.prizeValue}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Users className="h-4 w-4" />
                  Winners
                </div>
                <p className="font-bold text-lg">{raffle.winners}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <p className="font-bold text-lg">{raffle.created}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <User className="h-4 w-4" />
                  Reputation
                </div>
                <p className="font-bold text-lg">{raffle.hostReputation}%</p>
              </div>
            </div>
          </Card>

          {/* Host Section */}
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 space-y-4">
            <h2 className="text-lg font-bold mb-4">Hosted By</h2>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col truncate">
                  <p className="font-semibold break-words">{raffle.host}</p>
                  <p className="text-sm text-muted-foreground">
                    {raffle.hostReputation}% positive rating
                  </p>
                </div>
              </div>
              <div className="relative z-10">
                <HostProfilePopover hostId={raffle.hostId} />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT SIDE (Sidebar) */}
        <div className="lg:col-span-1">
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 space-y-4 sticky top-24">
            <div>
              <h3 className="text-xl font-bold mb-4">Enter Raffle</h3>
            </div>
            {/* Ticket Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted foreground" />
                  <span className="text-sm text-muted-foreground">
                    {raffle.sold} / {raffle.total} tickets sold
                  </span>
                </div>

                <span className="text-accent font-semibold">
                  {ticketsLeft} left
                </span>
              </div>
              <Progress
                value={(raffle.sold / raffle.total) * 100}
                className="h-3"
              />
            </div>

            {/* Ticket Price */}
            <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl border border-border/50 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-accent" />
                <span className="text-muted-foreground">Ticket Price</span>
              </div>
              <span className="text-xl font-bold">
                {raffle.price} {raffle.tokenType}
              </span>
            </div>

            {/* remaining time */}

            <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl border border-border/50 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Ends In</span>
              </div>
              <span className="text-muted-foreground text-xl font-bold">
                {countdown}
              </span>
            </div>

            {/* Countdown */}

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Number of Tickets
              </label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  className="bg-background-50"
                  size="icon"
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  disabled={!connected || ticketsLeft === 0}
                >
                  -
                </Button>
                <input
                  type="number"
                  value={ticketCount}
                  onChange={(e) =>
                    setTicketCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="flex h-10 w-full rounded-md text-center border border-border bg-background-50 rounded-md text-lg p-2 font-bold md:text-sm focus:ring-offset-2"
                  disabled={!connected || ticketsLeft === 0}
                />
                <Button
                  variant="outline"
                  className="bg-background-50"
                  size="icon"
                  onClick={() => setTicketCount(ticketCount + 1)}
                  disabled={!connected || ticketsLeft === 0}
                >
                  +
                </Button>
              </div>
            </div>
            {/* Total Cost */}
            <div className="flex items-center bg-card/50 backdrop-blur-xl border border-border/50 justify-between border-primary/30 p-4 rounded-lg bg-primary-10">
              <span className="font-semibold text-muted-foreground">
                Total Cost
              </span>
              <span className="text-2xl font-bold text-primary">
                {totalCost} {raffle.tokenType}
              </span>
            </div>

            {/* Buy Button */}
            <Button
              className="w-full mt-4 gradient-primary glow-primary h-12 text-lg"
              onClick={handleBuyTickets}
              disabled={!connected || ticketsLeft === 0}
            >
              <Ticket className="h-5 w-5 mr-2" />
              Buy {ticketCount} Ticket{ticketCount > 1 ? "s" : ""}
            </Button>

            {/* Info */}
            <div className="bg-card/50 backdrop-blur-xl border border-accent/30 rounded-lg flex gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">NFT Holder Discount</p>
                <p className="text-muted-foreground">
                  Connet a wallet with verified NFTs to get 2.5% fees instead of
                  5%
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
