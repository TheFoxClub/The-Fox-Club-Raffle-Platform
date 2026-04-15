import {
  Send,
  TrendingUp,
  Upload,
  Trash2,
  Plus,
  Copy,
  RefreshCw,
  Gift,
  Calendar,
  Users,
  Coins,
  ChevronDown,
  ChevronUp,
  Check,
  Wallet,
  AlertTriangle,
  Users2,
  Info,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { Progress } from "../../components/ui/Progress";
import { Switch } from "../../components/ui/Switch";
import { Label } from "../../components/ui/Label";
//import { useToast } from "../../hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import server from "../../config/server";
import { toast } from "react-toastify";
import { getTokenSymbol } from "../../utils/tokenUtils";
import { getVerifiedPaymentTokens } from "../raffle/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { Input } from "../../components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/Dialog";

type EligibleWallet = {
  id: number;
  address: string;
  createdAt: string;
  updatedAt: string;
};

type LeaderboardUser = {
  rank: number;
  userId: number;
  walletAddress: string;
  username: string | null;
  periodXp: number;
  periodUsdValue: number;
  transactionCount: number;
  allTimeXp: number;
  rewardAmount?: number;
};

type Airdrop = {
  id: number;
  airdropName?: string;
  startDate?: string;
  endDate?: string;
  totalReceivers: number;
  totalAmount: number;
  type: number;
  tokenSymbol: string | null;
  status: number;
  claimedCount: number;
  createdAt: string;
};

type ClaimablePreviewRecipient = {
  pubKey: string;
  xp: number;
  amount: number;
};

type ClaimablePreview = {
  airdropId: number;
  airdropName?: string;
  tokenSymbol: string | null;
  totalReceivers: number;
  totalAmount: number;
  recipients: ClaimablePreviewRecipient[];
};

const AIRDROP_STATUS_LABELS: Record<number, string> = {
  0: "Draft",
  1: "Pending",
  2: "Funded",
  3: "Active",
  4: "Completed",
  5: "Cancelled",
};

const AIRDROP_STATUS_COLORS: Record<number, string> = {
  0: "bg-gray-500/20 text-gray-400",
  1: "bg-yellow-500/20 text-yellow-400",
  2: "bg-blue-500/20 text-blue-400",
  3: "bg-green-500/20 text-green-400",
  4: "bg-purple-500/20 text-purple-400",
  5: "bg-red-500/20 text-red-400",
};

const LEADERBOARD_PAGE_SIZE = 10;

const toLocalDateTimeInput = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const normalizeDateTimeInput = (value: string, boundary: "start" | "end") => {
  if (!value) return value;

  const rawValue = value.trim();
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(rawValue);

  if (hasTimezone) {
    return new Date(rawValue).toISOString();
  }

  const normalizedValue = rawValue.includes(" ")
    ? rawValue.replace(" ", "T")
    : rawValue;

  const dateMatch = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/,
  );

  if (!dateMatch) return normalizedValue;

  const [, year, month, day, hour, minute, second, millisecond] = dateMatch;
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour ? Number(hour) : boundary === "end" ? 23 : 0,
    minute ? Number(minute) : boundary === "end" ? 59 : 0,
    second ? Number(second) : 0,
    millisecond ? Number(millisecond.padEnd(3, "0")) : 0,
  );

  return localDate.toISOString();
};

const parseAsUtcDate = (value?: string) => {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
  const utcInput = hasTimezone ? normalized : `${normalized}Z`;
  const parsed = new Date(utcInput);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function AdminRewards() {
  // const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Wallet connection
  const { publicKey, signTransaction, connected } = useWallet();

  const rewardPool = 0;
  const poolProgress = 0;
  const [topHosts, setTopHosts] = useState<any[]>([]);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);

  // Wallets
  const [walletInput, setWalletInput] = useState("");
  const [eligibleWallets, setEligibleWallets] = useState<EligibleWallet[]>([]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputWrapperRef = useRef<HTMLDivElement | null>(null);
  const [searchInput, setSearchInput] = useState(""); // Search input for wallet list

  // Airdrop state
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return toLocalDateTimeInput(start);
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 0, 0);
    return toLocalDateTimeInput(end);
  });
  const [airdropName, setAirdropName] = useState("");
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>(
    [],
  );
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
  const [leaderboardLimit, setLeaderboardLimit] = useState(
    LEADERBOARD_PAGE_SIZE,
  );
  const [hasLeaderboardLimit, setHasLeaderboardLimit] = useState(true);
  const [leaderboardPagination, setLeaderboardPagination] = useState({
    total: 0,
    page: 1,
    limit: hasLeaderboardLimit ? leaderboardLimit : -1, //sending -1 to set no limit
    totalPages: 0,
  });
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [totalAirdropAmount, setTotalAirdropAmount] = useState<number>(0);
  const [creatingAirdrop, setCreatingAirdrop] = useState(false);
  const [claimablePreviewOpen, setClaimablePreviewOpen] = useState(false);
  const [claimablePreviewLoading, setClaimablePreviewLoading] =
    useState(false);
  const [confirmingClaimable, setConfirmingClaimable] = useState(false);
  const [claimablePreview, setClaimablePreview] =
    useState<ClaimablePreview | null>(null);

  // Token selection (similar to CreateRaffle)
  const [tokenOptions, setTokenOptions] = useState<
    {
      value: string;
      label: string;
      decimals: number;
      tokenType: number;
      name?: string;
    }[]
  >([]);
  const [tokenOptionsLoading, setTokenOptionsLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<{
    value: string;
    label: string;
    decimals: number;
    tokenType: number;
    name?: string;
  } | null>(null);
  const selectedTokenSymbol = selectedToken?.label || "Token";

  // Filter wallets in list based on searchInput
  const filteredWalletList = searchInput
    ? eligibleWallets.filter((w) =>
        w.address.toLowerCase().includes(searchInput.toLowerCase()),
      )
    : eligibleWallets;

  const filteredWallets = walletInput
    ? eligibleWallets
        .filter(
          (wallet) =>
            wallet.address.toLowerCase().includes(walletInput.toLowerCase()) &&
            wallet.address.toLowerCase() !== walletInput.toLowerCase(),
        )
        .sort((a, b) => b.id - a.id)
    : [];

  const shortWallet = (wallet: string) =>
    wallet.slice(0, 4) + "..." + wallet.slice(-4);

  const formatAirdropDate = (value?: string) => {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    const date = parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const time = parsed.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${date} ${time}`;
  };

  const isEndDateReached = (value?: string) => {
    const endDateUtc = parseAsUtcDate(value);
    if (!endDateUtc) return false;

    // Compare epoch timestamps so gating is based on UTC instant.
    return Date.now() >= endDateUtc.getTime();
  };

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
    tokenAddress?: string,
  ) => {
    if (amount === null || amount === undefined)
      return `0 ${getTokenSymbol(tokenType, tokenAddress)}`;
    return `${amount} ${getTokenSymbol(tokenType, tokenAddress)}`;
  };

  // Fetch verified payment tokens on mount
  useEffect(() => {
    const fetchPaymentTokens = async () => {
      try {
        setTokenOptionsLoading(true);
        const response = await getVerifiedPaymentTokens();

        if (response.success && response.data?.tokens) {
          const tokens = response.data.tokens.map((token: any) => ({
            value: token.address,
            label: token.symbol || token.name,
            decimals: token.decimals,
            tokenType: token.tokenType,
            name: token.name,
          }));

          const uniqueTokens = Array.from(
            new Map(
              tokens.map((t: { value: string }) => [t.value, t]),
            ).values(),
          ) as typeof tokens;

          setTokenOptions(uniqueTokens);

          // Set default to SOL if available
          const solToken = tokens.find((t: any) => t.tokenType === 0);
          if (solToken && !selectedToken) {
            setSelectedToken(solToken);
          }
        } else {
          // Fallback to SOL only if API fails
          const fallbackTokens = [
            {
              value: "So11111111111111111111111111111111111111112",
              label: "SOL",
              decimals: 9,
              tokenType: 0,
              name: "Solana",
            },
          ];
          setTokenOptions(fallbackTokens);
          if (!selectedToken) {
            setSelectedToken(fallbackTokens[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch payment tokens:", error);
        // Fallback to SOL only
        const fallbackTokens = [
          {
            value: "So11111111111111111111111111111111111111112",
            label: "SOL",
            decimals: 9,
            tokenType: 0,
            name: "Solana",
          },
        ];
        setTokenOptions(fallbackTokens);
        if (!selectedToken) {
          setSelectedToken(fallbackTokens[0]);
        }
      } finally {
        setTokenOptionsLoading(false);
      }
    };

    fetchPaymentTokens();
  }, []);

  // Fetch leaderboard for the selected date range
  const fetchPeriodLeaderboard = async (page = 1) => {
    try {
      const normalizedStartDate = normalizeDateTimeInput(
        selectedStartDate,
        "start",
      );
      const normalizedEndDate = normalizeDateTimeInput(
        selectedEndDate,
        "end",
      );

      if (!normalizedStartDate || !normalizedEndDate) {
        toast.error("Please select both start and end dates");
        return;
      }

      if (new Date(normalizedStartDate) > new Date(normalizedEndDate)) {
        toast.error("Start date cannot be after end date");
        return;
      }

      if(hasLeaderboardLimit && leaderboardLimit < 1){
        toast.error("Leaderboard limit should be greater 0")
        return;
      }

      setLeaderboardLoading(true);
      const params = new URLSearchParams({
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        page: String(page),
        limit: hasLeaderboardLimit? String(leaderboardLimit) : "-1",
      });

      const res = await server.get(
        `/airdrop/xp-leaderboard?${params.toString()}`,
      );

      if (res.data.success) {
        const usersWithSelection = res.data.data.leaderboard.map(
          (user: LeaderboardUser) => ({
            ...user,
            rewardAmount: 0,
          }),
        );
        setLeaderboardUsers(usersWithSelection);
        setLeaderboardLoaded(true);

        const pagination = res.data.data.pagination || {
          total: usersWithSelection.length,
          page,
          limit: LEADERBOARD_PAGE_SIZE,
          totalPages: usersWithSelection.length > 0 ? 1 : 0,
        };
        setLeaderboardPagination(pagination);

        if ((pagination.total || 0) === 0) {
          toast.info("Currently no participants for the selected date.");
        }

        // Auto-distribute using proportional-to-XP method
        if (totalAirdropAmount > 0) {
          distributeRewards(usersWithSelection, totalAirdropAmount);
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to fetch leaderboard");
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Distribute rewards proportionally to period XP.
  const distributeRewards = (users: LeaderboardUser[], total: number) => {
    if (users.length === 0) return;

    const totalXp = users.reduce((sum, u) => sum + u.periodXp, 0);
    const updatedUsers = users.map((u) => ({
      ...u,
      rewardAmount:
        totalXp > 0
          ? ((u.periodXp / totalXp) * total)
          : 0,
    }));

    setLeaderboardUsers(updatedUsers);
  };

  // Handle total amount change
  const handleTotalAmountChange = (amount: number) => {
    setTotalAirdropAmount(amount);
    distributeRewards(leaderboardUsers, amount);
  };

  // Create airdrop with token transfer
  const createAirdrop = async () => {
    const normalizedStartDate = normalizeDateTimeInput(
      selectedStartDate,
      "start",
    );
    const normalizedEndDate = normalizeDateTimeInput(selectedEndDate, "end");

    const selectedUsers = leaderboardUsers.filter(
      (u) => u.rewardAmount && u.rewardAmount > 0,
    );
    const noParticipantsForRange =
      leaderboardLoaded && leaderboardPagination.total === 0;

    const enteredTotalAmount = Number(totalAirdropAmount || 0);
    const totalDistributed = noParticipantsForRange
      ? enteredTotalAmount
      : selectedUsers.reduce((sum, u) => sum + (u.rewardAmount || 0), 0);

    // Validation
    if (selectedUsers.length === 0 && !noParticipantsForRange) {
      toast.error("Please select at least one recipient with a reward amount");
      return;
    }

    if (!selectedToken) {
      toast.error("Please select a reward token");
      return;
    }

    if (!airdropName.trim()) {
      toast.error("Please enter an airdrop name");
      return;
    }

    if (!normalizedStartDate || !normalizedEndDate) {
      toast.error("Please enter both start and end date/time");
      return;
    }

    if (new Date(normalizedStartDate) > new Date(normalizedEndDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    // Check wallet connection
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet to fund the airdrop");
      return;
    }

    if (!signTransaction) {
      toast.error("Wallet does not support signing transactions");
      return;
    }

    if (totalDistributed <= 0) {
      toast.error("Please enter a total amount greater than 0");
      return;
    }

    try {
      setCreatingAirdrop(true);

      // Step 1: Prepare funding transaction
      toast.info("Preparing funding transaction...");
      const prepareRes = await server.post("/airdrop/prepare-funding", {
        totalAmount: totalDistributed,
        rewardType: selectedToken.tokenType,
        tokenAddress: selectedToken.value,
        tokenDecimals: selectedToken.decimals,
        fromAddress: publicKey.toString(),
      });

      if (!prepareRes.data.success) {
        throw new Error(
          prepareRes.data.message || "Failed to prepare funding transaction",
        );
      }

      const {
        transaction: serializedTx,
        checksum,
      } = prepareRes.data.data;

      // Step 2: Deserialize and sign transaction
      toast.info("Please sign the funding transaction in your wallet...");

      let tx: Transaction | VersionedTransaction;

      try {
        // Try legacy transaction first
        const txBytes = Uint8Array.from(atob(serializedTx), (c) =>
          c.charCodeAt(0),
        );
        tx = Transaction.from(txBytes);
      } catch {
        try {
          // Fallback to versioned transaction
          const txBytes = Uint8Array.from(atob(serializedTx), (c) =>
            c.charCodeAt(0),
          );
          tx = VersionedTransaction.deserialize(txBytes);
        } catch (e) {
          console.error("Failed to deserialize transaction:", e);
          throw new Error("Failed to deserialize funding transaction");
        }
      }

      // Sign transaction and submit it to backend (backend broadcasts on-chain)
      const signedTx = await signTransaction(tx);
      toast.info("Submitting funding transaction...");

      const signedTxBase64 =
        signedTx instanceof VersionedTransaction
          ? Buffer.from(signedTx.serialize()).toString("base64")
          : Buffer.from(
              signedTx.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
              }),
            ).toString("base64");

      // Step 4: Submit signed tx + create airdrop campaign records
      toast.info("Creating airdrop...");

      const confirmRes = await server.post("/airdrop/confirm-funding", {
        airdropName: airdropName.trim(),
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        totalAmount: totalDistributed,
        rewardType: selectedToken.tokenType,
        tokenAddress: selectedToken.value,
        tokenSymbol: selectedToken.label,
        tokenDecimals: selectedToken.decimals,
        hasLeaderboardLimit,
        leaderboardLimit: hasLeaderboardLimit ? leaderboardLimit : null,
        signedTransaction: signedTxBase64,
        checksum,
        fromAddress: publicKey.toString(),
      });

      if (!confirmRes.data.success) {
        throw new Error(confirmRes.data.message || "Failed to create airdrop");
      }

      const signature = confirmRes.data?.data?.fundingSignature;

      toast.success(
        <div>
          Airdrop created and funded successfully!{" "}
          {signature ? (
            <a
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Solscan
            </a>
          ) : null}
        </div>,
      );

      // Reset form
      setAirdropName("");
      setTotalAirdropAmount(0);
      setLeaderboardUsers([]);

      // Refresh airdrops list after successful creation
      await fetchAirdrops();
    } catch (error: any) {
      console.error("=== AIRDROP ERROR ===");
      console.error("Error:", error);

      // Handle user rejection
      if (
        error.message?.includes("User rejected") ||
        error.name === "WalletSignTransactionError"
      ) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to create airdrop",
        );
      }
    } finally {
      setCreatingAirdrop(false);
    }
  };

  // Fetch existing airdrops
  const fetchAirdrops = async () => {
    try {
      const res = await server.get("/airdrop?limit=10");
      if (res.data.success) {
        setAirdrops(res.data.data.airdrops);
      }
    } catch (error) {
      console.error("Error fetching airdrops:", error);
    }
  };

  // Update airdrop status
  const updateAirdropStatus = async (id: number, status: number) => {
    try {
      await server.put(`/airdrop/${id}/status`, { status });
      toast.success("Airdrop status updated");
      fetchAirdrops();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update status",
      );
    }
  };

  const openMakeClaimablePreview = async (id: number) => {
    try {
      setClaimablePreviewLoading(true);
      const res = await server.get(`/airdrop/${id}/make-claimable/preview`);

      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to preview claimable data");
      }

      setClaimablePreview(res.data.data);
      setClaimablePreviewOpen(true);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to preview claimable data",
      );
    } finally {
      setClaimablePreviewLoading(false);
    }
  };

  const confirmMakeAirdropClaimable = async () => {
    if (!claimablePreview?.airdropId) return;

    try {
      setConfirmingClaimable(true);
      await server.post(`/airdrop/${claimablePreview.airdropId}/make-claimable`);
      toast.success("Airdrop is now claimable");
      setClaimablePreviewOpen(false);
      setClaimablePreview(null);
      fetchAirdrops();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to make airdrop claimable",
      );
    } finally {
      setConfirmingClaimable(false);
    }
  };

  const fetchEligibleWallets = async () => {
    const res = await server.get("/pool");
    setEligibleWallets(res.data.data.rows.reverse());
  };

  const handleAddWallet = async () => {
    const address = walletInput.trim();
    if (!address) return;

    const exists = eligibleWallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase(),
    );

    if (exists) {
      toast.warning("Wallet already exists");
      return;
    }

    try {
      const res = await server.post("/pool", { address });
      setEligibleWallets((prev) => [res.data.data, ...prev]);
      toast.success("Wallet added successfully");
      setWalletInput("");
      setShowSuggestions(false);
    } catch {
      toast.error("Failed to add wallet");
    }
  };

  const handleDeleteWallet = async () => {
    const address = walletInput.trim();
    if (!address) return;

    const exists = eligibleWallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase(),
    );

    if (!exists) {
      toast.warning("Wallet not found");
      return;
    }

    try {
      await server.delete(`/pool?address=${address}`);
      setEligibleWallets((prev) =>
        prev.filter((wallet) => wallet.address !== address),
      );
      toast.success("Wallet removed successfully");
      setWalletInput("");
      setShowSuggestions(false);
    } catch {
      toast.error("Failed to delete wallet");
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      await server.post("/pool/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("CSV uploaded successfully");
      await fetchEligibleWallets();
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload CSV");
    } finally {
      e.target.value = "";
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leaderboardRes, walletRes, airdropRes] = await Promise.all([
        server.get("/admin/leaderboard"),
        server.get("/pool"),
        server
          .get("/airdrop?limit=10")
          .catch(() => ({ data: { success: false } })),
      ]);

      setTopHosts(
        leaderboardRes.data.data.topHosts.map((host: any) => ({
          ...host,
          tokenType: mapNumericTokenType(host.tokenType || 0),
        })),
      );
      setTopBuyers(
        leaderboardRes.data.data.topBuyers.map((buyer: any) => ({
          ...buyer,
          tokenType: mapNumericTokenType(buyer.tokenType || 0),
        })),
      );
      setEligibleWallets(walletRes.data.data.rows);

      if (airdropRes.data.success) {
        setAirdrops(airdropRes.data.data.airdrops || []);
      }
    } catch (error) {
      toast.error("Failed to refresh dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return <p>Loading rewards dashboard...</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page-level actions */}
      <div className="flex justify-end">
        <Button
          variant="default"
          size="icon"
          onClick={fetchData}
          disabled={loading}
          title="Refresh Rewards Data"
          className="hover:bg-accent"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin text-muted-foreground" : ""
            }`}
          />
        </Button>
      </div>

      {/* Reward Pool Status */}
      {/* <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold">Reward Pool</h2>
            <p className="text-sm text-muted-foreground">
              Current accumulated rewards
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gradient">
              {rewardPool} {selectedTokenSymbol}
            </p>
            <p className="text-sm text-muted-foreground">
              Available for distribution
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span>Pool Progress</span>
              <span className="text-muted-foreground">
                {poolProgress}% to target
              </span>
            </div>
            <Progress value={poolProgress} className="h-2" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border/30 gap-3">
            <div className="flex items-center gap-3">
              <Switch id="auto-airdrop" defaultChecked />
              <Label
                htmlFor="auto-airdrop"
                className="cursor-pointer text-xs sm:text-sm"
              >
                Auto Airdrop (Month-end)
              </Label>
            </div>
          </div>
        </div>
      </div> */}

      {/* Airdrop Creation Section */}
      <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Create Leaderboard Airdrop
            </h2>
            <p className="text-sm text-muted-foreground">
              Reward top XP earners for a selected date range
            </p>
          </div>
        </div>

        {/* Airdrop Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Airdrop Name *
            </label>
            <input
              type="text"
              value={airdropName}
              onChange={(e) => setAirdropName(e.target.value)}
              placeholder="e.g., March 2026 Rewards"
              className="w-full border border-input rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Reward Token *
            </label>
            {tokenOptionsLoading ? (
              <div className="w-full border border-input rounded-lg p-2 text-sm bg-background text-muted-foreground">
                Loading tokens...
              </div>
            ) : (
              <select
                value={selectedToken?.value || ""}
                onChange={(e) => {
                  const token = tokenOptions.find(
                    (t) => t.value === e.target.value,
                  );
                  setSelectedToken(token || null);
                }}
                className="w-full border border-input rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              >
                {tokenOptions.map((token) => (
                  <option key={token.value} value={token.value}>
                    {token.label}{" "}
                    {token.name && token.name !== token.label
                      ? `(${token.name})`
                      : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Users2 width={16} height={16} />
            Number of Airdrop Claimers
          </h3>
          <div className="flex flex-row gap-2">
            <input
              type="checkbox"
              name="leaderboardLimit"
              id="leaderboardLimit"
              checked={hasLeaderboardLimit}
              onChange={(e) => setHasLeaderboardLimit(e.target.checked)}
            />
            <label htmlFor="leaderboardLimit">Set Leaderboard Limit</label>
          </div>
          {hasLeaderboardLimit && (
            <Input
              type="number"
              value={leaderboardLimit}
              onChange={(e) => setLeaderboardLimit(Number(e.target.value))}
              className="w-50 mt-2 text-center "
            />
          )}
        </div>

        {/* Month/Year Selection */}
        <div className="border-t border-border/30 pt-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Select Leaderboard Date Range
          </h3>
          <div className="flex flex-wrap flex-col gap-4">
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={selectedStartDate}
                  onChange={(e) => setSelectedStartDate(e.target.value)}
                  className="border border-input rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={selectedEndDate}
                  onChange={(e) => setSelectedEndDate(e.target.value)}
                  className="border border-input rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>
            </div>
            <Button
              onClick={() => fetchPeriodLeaderboard(1)}
              disabled={leaderboardLoading}
              className="gradient-primary"
            >
              {leaderboardLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Load Leaderboard
            </Button>
          </div>
        </div>

        {/* Distribution Settings */}
        {leaderboardLoaded && (
          <div className="border-t border-border/30 pt-4">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Reward Distribution
            </h3>
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Total Amount ({selectedTokenSymbol})
                </label>
                <input
                  type="number"
                  value={totalAirdropAmount || ""}
                  onChange={(e) =>
                    handleTotalAmountChange(parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  step={0.001}
                  placeholder="0.00"
                  className="w-32 border border-input rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Distribution method: proportional to XP in the selected period.
              </p>
            </div>

            {/* Recipients Table */}
            {leaderboardUsers.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Info className="h-4 w-4" />
                  This table is not indicating final distribution amounts.
                </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Rank</th>
                        <th className="p-2 text-left">Wallet</th>
                        <th className="p-2 text-left">Period XP</th>
                        <th className="p-2 text-left">
                          Reward ({selectedTokenSymbol})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardUsers.map((user) => (
                        <tr
                          key={user.userId}
                          className="border-t border-border/30 bg-primary/5"
                        >
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                user.rank === 1
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : user.rank === 2
                                    ? "bg-gray-400/20 text-gray-300"
                                    : user.rank === 3
                                      ? "bg-orange-500/20 text-orange-400"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {user.rank}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">
                                {shortWallet(user.walletAddress)}
                              </span>
                              {user.username && (
                                <span className="text-xs text-muted-foreground">
                                  ({user.username})
                                </span>
                              )}
                              <button
                                onClick={() =>
                                  copyToClipboard(user.walletAddress)
                                }
                                className="text-muted-foreground hover:text-primary"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-2 font-semibold">
                            {user.periodXp.toLocaleString()}
                          </td>
                          <td className="p-2">
                            <span className="font-medium">
                              {(user.rewardAmount || 0).toFixed(6)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 text-sm text-muted-foreground bg-muted/20">
                Currently no participants for the selected date. You can still
                fund and create this airdrop now. Leaderboard XP will update in
                real time until the airdrop end date.
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Page {leaderboardPagination.page} of{" "}
                {Math.max(leaderboardPagination.totalPages, 1)} (
                {leaderboardPagination.total} users)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    leaderboardLoading ||
                    leaderboardPagination.page <= 1 ||
                    leaderboardPagination.totalPages === 0
                  }
                  onClick={() =>
                    fetchPeriodLeaderboard(
                      Math.max(1, leaderboardPagination.page - 1),
                    )
                  }
                >
                  <ChevronUp className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    leaderboardLoading ||
                    leaderboardPagination.page >=
                      leaderboardPagination.totalPages ||
                    leaderboardPagination.totalPages === 0
                  }
                  onClick={() =>
                    fetchPeriodLeaderboard(leaderboardPagination.page + 1)
                  }
                >
                  Next <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Selected:</span>{" "}
                  <span className="font-semibold">
                    {leaderboardUsers.length} users
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Total to distribute:
                  </span>{" "}
                  <span className="font-semibold text-primary">
                    {leaderboardUsers
                      .reduce((sum, u) => sum + (u.rewardAmount || 0), 0)
                      .toFixed(6)}{" "}
                    {selectedTokenSymbol}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  {connected ? (
                    <span className="text-green-400 text-xs">Connected</span>
                  ) : (
                    <span className="text-yellow-400 text-xs">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={createAirdrop}
                disabled={
                  creatingAirdrop ||
                  !connected ||
                  (
                    leaderboardUsers.filter((u) => u.rewardAmount).length === 0 &&
                    !(leaderboardLoaded && leaderboardPagination.total === 0)
                  )
                }
                className="gradient-primary"
                title={!connected ? "Connect wallet to create airdrop" : ""}
              >
                {creatingAirdrop ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {!connected ? "Connect Wallet" : "Fund & Create Airdrop"}
              </Button>
            </div>
          </div>
        )}

        {/* Existing Airdrops */}
        {airdrops.length > 0 && (
          <div className="border-t border-border/30 pt-4">
            <h3 className="text-base font-semibold mb-3">Recent Airdrops</h3>
            <div className="space-y-2">
              {airdrops.map((airdrop) =>
                (() => {
                  const remainingCount = Math.max(
                    0,
                    (airdrop.totalReceivers || 0) - (airdrop.claimedCount || 0),
                  );

                  return (
                    <div
                      key={airdrop.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card/50 rounded-lg border border-border/30 gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {airdrop.airdropName || `Airdrop #${airdrop.id}`}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              AIRDROP_STATUS_COLORS[airdrop.status] ||
                              "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {AIRDROP_STATUS_LABELS[airdrop.status] || "Unknown"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatAirdropDate(airdrop.startDate)} -{" "}
                          {formatAirdropDate(airdrop.endDate)} •
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {airdrop.totalReceivers} recipients •{" "}
                          {airdrop.totalAmount}{" "}
                          {airdrop.tokenSymbol || selectedTokenSymbol} •
                          Claimed: {airdrop.claimedCount}/
                          {airdrop.totalReceivers} • Remaining: {remainingCount}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {airdrop.status === 2 && (
                          <>
                            {isEndDateReached(airdrop.endDate) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMakeClaimablePreview(airdrop.id)}
                                disabled={claimablePreviewLoading}
                                title="Make Claimable"
                              >
                                <Check className="h-3 w-3 mr-1" /> Make Claimable
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAirdropStatus(airdrop.id, 5)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {airdrop.status === 3 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAirdropStatus(airdrop.id, 5)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })(),
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={claimablePreviewOpen}
        onOpenChange={(open) => {
          setClaimablePreviewOpen(open);
          if (!open) {
            setClaimablePreview(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Make Claimable</DialogTitle>
            <DialogDescription>
              Review planned claimable allocations before confirming.
            </DialogDescription>
          </DialogHeader>

          {claimablePreview ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>
                  Airdrop: {claimablePreview.airdropName || `#${claimablePreview.airdropId}`}
                </p>
                <p>
                  Total Receivers: {claimablePreview.totalReceivers} | Total Amount: {Number(claimablePreview.totalAmount || 0).toFixed(6)} {claimablePreview.tokenSymbol || selectedTokenSymbol}
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Pubkey</th>
                      <th className="p-2 text-left">XP</th>
                      <th className="p-2 text-left">Planned Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimablePreview.recipients.map((recipient) => (
                      <tr key={recipient.pubKey} className="border-t border-border/30">
                        <td className="p-2 font-mono text-xs break-all">{recipient.pubKey}</td>
                        <td className="p-2">{Number(recipient.xp || 0).toLocaleString()}</td>
                        <td className="p-2">{Number(recipient.amount || 0).toFixed(9)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No preview data available.</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setClaimablePreviewOpen(false);
                setClaimablePreview(null);
              }}
              disabled={confirmingClaimable}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmMakeAirdropClaimable}
              disabled={!claimablePreview || confirmingClaimable}
            >
              {confirmingClaimable ? "Confirming..." : "Confirm & Make Claimable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eligible Wallets Section */}
      {/*(<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <h2 className="text-xl font-bold">Add or Remove Wallets</h2>
          <div ref={inputWrapperRef} className="relative mt-8 mb-4">
            <input
              value={walletInput}
              onChange={(e) => {
                setWalletInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => walletInput && setShowSuggestions(true)}
              placeholder="Enter wallet address"
              className="w-full border border-input rounded-lg p-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {walletInput && (
              <button
                type="button"
                onClick={() => {
                  setWalletInput("");
                  setShowSuggestions(false);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}

            {showSuggestions && walletInput && filteredWallets.length > 0 && (
              <div className="absolute top-full left-0 z-20 w-full max-h-40 overflow-y-auto rounded-lg border bg-card shadow-lg mt-2">
                {filteredWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => {
                      setWalletInput(wallet.address);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/30 font-mono"
                  >
                    {wallet.address}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 mb-4">
            <Button
              onClick={handleAddWallet}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Wallet
            </Button>
            <Button
              onClick={handleDeleteWallet}
              variant="destructive"
              disabled={!walletInput} // disable when input is empty
              className={`flex-1 flex items-center justify-center gap-2 ${
                !walletInput ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Trash2 className="h-4 w-4" />
              Delete Wallet
            </Button>
          </div>

          <label className="cursor-pointer w-full border border-dashed rounded-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/10">
            <Upload className="h-4 w-4" /> Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a CSV with one wallet per row
          </p>
        </div>

        {// Right: Scrollable wallet list }
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50 max-h-80 flex flex-col w-full overflow-y-auto">
          <div className="sticky top-0 z-10 p-1 mb-2 flex flex-col gap-2">
            <h2 className="text-base font-semibold">
              Current Eligible Wallets
            </h2>
            <input
              type="text"
              placeholder="Search wallets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-input rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted/50 w-full">
            {filteredWalletList.length > 0 ? (
              filteredWalletList.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex justify-between items-center p-2 mb-1 rounded bg-card/50 border border-border/20 w-full wrap-break-word"
                >

                  <p
                    className="text-xs text-muted-foreground break-all mb-3 cursor-pointer hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(wallet.address);
                      toast.success("Wallet address copied!");
                    }}
                    title="Click to copy"
                  >
                    {wallet.address}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No wallets found
              </p>
            )}
          </div>
        </div>
      </div>)*/}

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Hosts */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Top Hosts
            </h3>
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("hosts")}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button> */}
          </div>

          <div className="space-y-4">
            {topHosts.length > 0 ? (
              topHosts.map((host) => (
                <div
                  key={host.walletAddress}
                  className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/30"
                >
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      host.rank === 1
                        ? "bg-gradient-primary text-white"
                        : host.rank === 2
                          ? "bg-secondary/20 text-secondary"
                          : "bg-accent/20 text-accent"
                    }`}
                  >
                    {host.rank}
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => copyToClipboard(host.walletAddress)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                    >
                      {shortWallet(host.walletAddress)}
                      <Copy className="h-3 w-3 opacity-50" />
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Total Volume
                    </p>
                  </div>
                  <p className="font-bold text-primary">
                    {formatAmount(
                      host.totalRevenue,
                      host.tokenType,
                      host.tokenAddress,
                    )}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">
                No top hosts available yet.
              </p>
            )}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="glass-card p-4 sm:p-6 rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              Top Buyers
            </h3>
          </div>

          <div className="space-y-4">
            {topBuyers.length > 0 ? (
              topBuyers.map((buyer) => (
                <div
                  key={buyer.walletAddress}
                  className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/30"
                >
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      buyer.rank === 1
                        ? "bg-gradient-primary text-white"
                        : buyer.rank === 2
                          ? "bg-secondary/20 text-secondary"
                          : "bg-accent/20 text-accent"
                    }`}
                  >
                    {buyer.rank}
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => copyToClipboard(buyer.walletAddress)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
                    >
                      {shortWallet(buyer.walletAddress)}
                      <Copy className="h-3 w-3 opacity-50" />
                    </button>
                    <p className="text-sm text-muted-foreground">
                      Total Spending
                    </p>
                  </div>
                  <p className="font-bold text-accent">
                    {formatAmount(
                      buyer.totalSpent,
                      buyer.tokenType,
                      buyer.tokenAddress,
                    )}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">
                No top buyers available yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
