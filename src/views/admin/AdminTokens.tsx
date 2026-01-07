import { useState, useEffect } from "react";
import { Plus, Trash2, Copy, RefreshCw } from "lucide-react";
import Button from "../../components/ui/Button";
// import { Input } from "../../components/ui/Input";
// import { Label } from "../../components/ui/Label";
import { Switch } from "../../components/ui/Switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/Dialog";
import server from "../../config/server";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { toast } from "react-toastify";

const solanaToken = {
  id: 1,
  name: "Solana",
  mint: "So11111111111111111111111111111111111111112",
  decimals: 9,
  active: true,
};

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function AdminTokens() {
  const user = useSelector((state: RootState) => state.user);
  const [open, setOpen] = useState(false);
  const [tokenCandidates, setTokenCandidates] = useState<
    { mint: string; name: string; decimals: number; programId: string }[]
  >([]);
  const [verifiedTokens, setVerifiedTokens] = useState<
    {
      id: number;
      address: string;
      name: string;
      decimals: number;
      isVerified: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<{
    mint: string;
    name: string;
    decimals: number;
    programId: string;
  } | null>(null);
  // const [solanaVerified, setSolanaVerified] = useState(solanaToken.active);

  useEffect(() => {
    if (!open || !user.isAuthenticated) return;

    const fetchTokens = async () => {
      try {
        setLoading(true);
        const res = await server.get(`/tokens/${user.pubkey}`);
        const spl = res.data?.message?.splTokens || [];
        const mapped = spl.map((t: any, idx: number) => {
          const info = t.account?.data?.parsed?.info;
          const decimals = info?.tokenAmount?.decimals ?? 0;
          const mint = info?.mint || `unknown-${idx}`;
          const programId = t.account?.owner || t.programId || TOKEN_PROGRAM_ID;
          const name =
            t.metadata?.name ||
            t.metadata?.symbol ||
            `Token ${mint.slice(0, 6)}...`;
          return { mint, name, decimals, programId };
        });
        setTokenCandidates(mapped);
      } catch (err) {
        console.error(err);
        setTokenCandidates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTokens();
  }, [open, user.isAuthenticated, user.pubkey]);

  // Fetch verified tokens from API
  const fetchVerifiedTokens = async () => {
    try {
      setLoading(true);
      const res = await server.get("/admin/verified-token");
      setVerifiedTokens(res.data?.data?.tokens || []);
    } catch (err) {
      console.error("Failed to fetch verified tokens", err);
      toast.error("Failed to refresh tokens");
      setVerifiedTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifiedTokens();
  }, []);

  const handleSelectToken = (token: {
    mint: string;
    name: string;
    decimals: number;
    programId: string;
  }) => {
    setSelectedToken(token);
  };

  const handleAddVerifiedToken = async () => {
    if (!selectedToken) return;
    try {
      await server.post("/admin/verified-token", {
        address: selectedToken.mint,
        name: selectedToken.name,
        decimals: selectedToken.decimals,
      });
      setOpen(false);
      setSelectedToken(null);
      // Refresh verified tokens list
      const res = await server.get("/admin/verified-token");
      setVerifiedTokens(res.data?.data?.tokens || []);
    } catch (err) {
      console.error("Failed to create verified token", err);
    }
  };

  const handleToggleVerify = async (tokenId: number) => {
    try {
      const res = await server.patch(
        `/admin/verified-token/${tokenId}/toggle-verify`
      );
      const updatedToken = res.data?.data?.token;

      if (updatedToken) {
        // Update the local state to reflect the change
        setVerifiedTokens((prev) =>
          prev.map((t) => (t.id === updatedToken.id ? updatedToken : t))
        );
        if (updatedToken.isVerified) {
          toast.success("Token verified successfully!");
        } else {
          toast.success("Token unverified successfully!");
        }
      }
    } catch (err) {
      console.error("Failed to toggle token verification", err);
    }
  };

  const handleDeleteVerifiedToken = async (tokenId: number) => {
    try {
      const res = await server.delete(`/admin/verified-token/${tokenId}`);
      if (res.data?.success) {
        // Remove the token from state
        setVerifiedTokens((prev) => prev.filter((t) => t.id !== tokenId));

        // Show success toast
        toast.success(res.data.message || "Token deleted successfully!");
      } else {
        toast.error(res.data?.message || "Failed to delete token");
      }
    } catch (err: any) {
      console.error("Failed to delete token", err);
      toast.error(err.response?.data?.message || "Failed to delete token");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mint address copied!", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (err) {
      toast.error("Failed to copy mint address", {
        position: "top-right",
      });
    }
  };

  return (
    <div className="w-84 md:w-full">
      {/* Header */}
      <div className="flex flex-col mb-4 sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start justify-between sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">Token Management</h2>
            <p className="text-muted-foreground">
              Configure supported tokens and their fees
            </p>
          </div>
          <Button
            variant="default"
            size="icon"
            onClick={fetchVerifiedTokens}
            disabled={loading}
            title="Refresh tokens"
            className="sm:hidden hover:bg-accent"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin text-muted-foreground" : ""
              }`}
            />
          </Button>
        </div>
        <div className="flex flex-col mb-4 gap-3 sm:items-center sm:flex-row justify-between sm:justify-end">
          <Button
            variant="default"
            size="icon"
            onClick={fetchVerifiedTokens}
            disabled={loading}
            title="Refresh tokens"
            className="hidden sm:flex hover:bg-accent"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin text-muted-foreground" : ""
              }`}
            />
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Token
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl mx-2 max-h-[70vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Select Token from Your Wallet</DialogTitle>
              </DialogHeader>

              {loading ? (
                <p className="text-center py-6 text-muted-foreground">
                  Loading tokens...
                </p>
              ) : tokenCandidates.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">
                  No tokens found in your wallet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {tokenCandidates.map((token) => {
                    const isSelected = selectedToken?.mint === token.mint;

                    return (
                      <button
                        key={token.mint}
                        type="button"
                        onClick={() => handleSelectToken(token)}
                        disabled={isSelected}
                        className={`group relative overflow-hidden rounded-lg border-2 transition-all flex items-center w-full h-16 px-3 py-2 ${
                          isSelected
                            ? "border-green-500 opacity-50 cursor-not-allowed"
                            : "border-border hover:border-primary hover:scale-105"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {token.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Mint: {token.mint}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            Selected
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button
                  className="gradient-primary"
                  disabled={!selectedToken}
                  onClick={handleAddVerifiedToken}
                >
                  Add
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tokens Table */}
      <div className="glass-card rounded-xl border border-border/50 ">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[650px] table-fixed">
            <thead className="border-b border-border/50">
              <tr className="text-left text-sm text-muted-foreground whitespace-nowrap">
                <th className="p-4 font-medium">Token Name</th>
                <th className="p-4 font-medium">Address</th>
                <th className="p-4 font-medium">Decimals</th>
                {/* <th className="p-4 font-medium">Fee %</th>
                <th className="p-4 font-medium">Status</th> */}
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {/* Solana token first */}
              <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="p-4 font-medium">{solanaToken.name}</td>
                <td className="p-4">
                  <button
                    className="flex items-center gap-1 hover:text-primary transition"
                    onClick={() => copyToClipboard(solanaToken.mint)}
                  >
                    {truncateAddress(solanaToken.mint)}
                    <Copy className="h-3 w-3 opacity-50 ml-1" />
                  </button>
                </td>
                <td className="p-4 text-muted-foreground">
                  {solanaToken.decimals}
                </td>
                {/* <td className="p-4">
                  <Switch
                    checked={solanaVerified}
                    onCheckedChange={(val) => {
                      setSolanaVerified(val);
                      if (val) {
                        toast.success("Solana token verified successfully!");
                      } else {
                        toast.success("Solana token unverified successfully!");
                      }
                    }}
                  />
                </td> */}
              </tr>

              {verifiedTokens.map((token) => (
                <tr
                  key={token.id}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4 font-medium">{token.name}</td>
                  <td className="p-4">
                    <button
                      className="flex items-center gap-1 hover:text-primary transition"
                      onClick={() => copyToClipboard(token.address)}
                    >
                      {truncateAddress(token.address)}
                      <Copy className="h-3 w-3 opacity-50 ml-1" />
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {token.decimals}
                  </td>
                  {/* <td className="p-4">
                    <span className="text-accent font-medium">
                      {token.fee}%
                    </span>
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <span className="text-accent font-medium">
                      {token.fee}%
                    </span>
                  </td> */}

                  <td className="p-4 whitespace-nowrap">
                    <Switch
                      checked={token.isVerified}
                      onCheckedChange={() => handleToggleVerify(token.id)}
                      title={
                        token.isVerified
                          ? "Click to unverify this token"
                          : "Click to verify this token"
                      }
                    />
                  </td>

                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button> */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteVerifiedToken(token.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
