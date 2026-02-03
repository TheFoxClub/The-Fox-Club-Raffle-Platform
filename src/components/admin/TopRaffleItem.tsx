import { Copy } from "lucide-react";
import { useTokenSymbol } from "../../hooks/useTokenDisplay";
import { toast } from "react-toastify";

interface TopRaffleItemProps {
  raffle: {
    raffleName: string;
    creatorAddress: string;
    revenue: number | string;
    tokenTypeRaw: number;
    tokenAddress?: string;
    totalTicketsSold: number;
    status: string;
  };
}

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

const shortWallet = (address: string) => {
  if (!address) return "";
  return address.slice(0, 6) + "..." + address.slice(-6);
};

export const TopRaffleItem = ({ raffle }: TopRaffleItemProps) => {
  const tokenType = mapNumericTokenType(raffle.tokenTypeRaw || 0);
  const { symbol: enhancedTokenSymbol, loading: tokenLoading } = useTokenSymbol(
    tokenType,
    raffle.tokenAddress
  );

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied!", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err) {
      toast.error("Failed to copy wallet address", {
        position: "top-right",
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 transition-all gap-3">
      <div className="flex-1 min-w-[200px]">
        <h3 className="font-semibold mb-1">{raffle.raffleName}</h3>
        <button
          onClick={() => copyToClipboard(raffle.creatorAddress)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition"
        >
          {shortWallet(raffle.creatorAddress)}
          <Copy className="h-3 w-3 opacity-50" />
        </button>
      </div>
      <div className="flex justify-between sm:flex-col sm:items-end gap-2 w-full sm:w-auto">
        <p className="font-bold text-primary">
          {raffle.revenue} {tokenLoading ? "..." : enhancedTokenSymbol}
        </p>
        <p className="text-sm text-muted-foreground">
          {raffle.totalTicketsSold} tickets
        </p>
      </div>
      <div className="w-24 text-center">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            raffle.status === "LIVE"
              ? "bg-green-500/20 text-green-500"
              : raffle.status == "UPCOMING"
                ? "bg-secondary/20 text-secondary"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {raffle.status}
        </span>
      </div>
    </div>
  );
};