import { Copy } from "lucide-react";
import { useTokenSymbol } from "../../hooks/useTokenDisplay";
import { toast } from "react-toastify";

interface TopCreatorItemProps {
  creator: {
    walletAddress: string;
    rank: number;
    totalRevenue: number | string;
    tokenType?: string;
    tokenAddress?: string;
  };
}

const shortWallet = (address: string) => {
  if (!address) return "";
  return address.slice(0, 6) + "..." + address.slice(-6);
};

export const TopCreatorItem = ({ creator }: TopCreatorItemProps) => {
  const { symbol: enhancedTokenSymbol, loading: tokenLoading } = useTokenSymbol(
    creator.tokenType || "SOLANA",
    creator.tokenAddress
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
    <div className="flex items-center gap-3">
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
          creator.rank === 1
            ? "bg-gradient-primary text-white"
            : creator.rank === 2
              ? "bg-secondary/20 text-secondary"
              : "bg-accent/20 text-accent"
        }`}
      >
        {creator.rank}
      </div>
      <div className="flex-1">
        <button
          onClick={() => copyToClipboard(creator.walletAddress)}
          className="flex items-center gap-1 text-sm font-medium hover:text-primary transition"
        >
          {shortWallet(creator.walletAddress)}
          <Copy className="h-3 w-3 opacity-50" />
        </button>
        <p className="text-xs text-muted-foreground">
          {creator.totalRevenue} {tokenLoading ? "..." : enhancedTokenSymbol}
        </p>
      </div>
    </div>
  );
};