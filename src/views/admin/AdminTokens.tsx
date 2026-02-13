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
  id: "sol-builtin",
  name: "Solana",
  symbol: "SOL",
  mint: "So11111111111111111111111111111111111111112",
  decimals: 9,
  tokenType: 0,
  isVerified: true,
  isPaymentToken: true,
  isBuiltIn: true,
};

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function TokenTableSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-border/30">
          <td className="p-4">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-4 w-10 rounded bg-muted animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-5 w-10 rounded bg-muted animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-5 w-10 rounded bg-muted animate-pulse" />
          </td>
          <td className="p-4">
            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AdminTokens() {
  const user = useSelector((state: RootState) => state.user);
  const [open, setOpen] = useState(false);
  const [tokenCandidates, setTokenCandidates] = useState<
    {
      mint: string;
      name: string;
      symbol: string;
      decimals: number;
      programId: string;
    }[]
  >([]);
  const [verifiedTokens, setVerifiedTokens] = useState<
    {
      id: number;
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      tokenType: number;
      programId: string;
      isVerified: boolean;
      isPaymentToken: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingVerified, setLoadingVerified] = useState(false);

  const [selectedToken, setSelectedToken] = useState<{
    mint: string;
    name: string;
    symbol: string;
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
        const SOLANA_MINT = "So11111111111111111111111111111111111111112";

        const mapped = spl
          .filter((t: any) => {
            const info = t.account?.data?.parsed?.info;
            const mint = info?.mint;
            // Filter out Solana token to prevent duplication
            return mint && mint !== SOLANA_MINT;
          })
          .map((t: any, idx: number) => {
            const info = t.account?.data?.parsed?.info;
            const decimals = info?.tokenAmount?.decimals ?? 0;
            const mint = info?.mint || `unknown-${idx}`;
            const programId =
              t.account?.owner || t.programId || TOKEN_PROGRAM_ID;

            // Try to get symbol from metadata, fallback to name or mint
            let symbol =
              t.metadata?.symbol ||
              t.metadata?.name ||
              `Token ${mint.slice(0, 6)}...`;
            let name = t.metadata?.name || symbol;

            // Truncate symbol to 10 characters maximum (database limit)
            if (symbol.length > 10) {
              symbol = symbol.substring(0, 10);
            }

            return { mint, name, symbol, decimals, programId };
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

  // Fetch verified tokens from API (excluding SOL which is built-in)
  const fetchVerifiedTokens = async () => {
    try {
      setLoadingVerified(true);
      const res = await server.get("/admin/verified-token");
      // Filter out SOL if it exists in database - it should be built-in only
      const tokens = (res.data?.data?.tokens || []).filter(
        (token) =>
          token.address !== "So11111111111111111111111111111111111111112",
      );
      setVerifiedTokens(tokens);
    } catch (err) {
      console.error("Failed to fetch verified tokens", err);
      toast.error("Failed to refresh tokens");
      setVerifiedTokens([]);
    } finally {
      setLoadingVerified(false);
    }
  };

  useEffect(() => {
    fetchVerifiedTokens();
  }, []);

  const handleSelectToken = (token: {
    mint: string;
    name: string;
    symbol: string;
    decimals: number;
    programId: string;
  }) => {
    setSelectedToken(token);
  };

  const handleAddVerifiedToken = async () => {
    if (!selectedToken) return;

    try {
      // Prevent Solana token duplication
      const SOLANA_MINT = "So11111111111111111111111111111111111111112";
      if (selectedToken.mint === SOLANA_MINT) {
        toast.error("Solana is a built-in token and cannot be added manually");
        return;
      }

      // Determine token symbol - try to get from metadata or fallback to name
      let symbol =
        selectedToken.symbol ||
        selectedToken.name ||
        `Token ${selectedToken.mint.slice(0, 6)}...`;

      const originalSymbol = symbol;
      if (symbol.length > 10) {
        symbol = symbol.substring(0, 10);
        console.log(
          `Token symbol truncated from "${originalSymbol}" to "${symbol}" (10 char limit)`,
        );
      }

      await server.post("/admin/verified-token", {
        address: selectedToken.mint,
        name: selectedToken.name,
        symbol: symbol,
        decimals: selectedToken.decimals,
        programId: selectedToken.programId,
      });

      setOpen(false);
      setSelectedToken(null);
      toast.success("Token added successfully!");

      // Refresh verified tokens list
      await fetchVerifiedTokens();
    } catch (err: any) {
      console.error("Failed to create verified token", err);
      const errorMessage = err.response?.data?.message || "Failed to add token";
      toast.error(errorMessage);
    }
  };

  const handleToggleVerify = async (tokenId: number) => {
    try {
      const res = await server.patch(
        `/admin/verified-token/${tokenId}/toggle-verify`,
      );
      const updatedToken = res.data?.data?.token;

      if (updatedToken) {
        // Update the local state to reflect the change
        setVerifiedTokens((prev) =>
          prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)),
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

  const handleTogglePaymentToken = async (tokenId: number) => {
    try {
      const res = await server.patch(
        `/admin/verified-token/${tokenId}/toggle-payment`,
      );
      const updatedToken = res.data?.data?.token;

      if (updatedToken) {
        setVerifiedTokens((prev) =>
          prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)),
        );
        if (updatedToken.isPaymentToken) {
          toast.success("Token enabled for payments!");
        } else {
          toast.success("Token disabled for payments!");
        }
      }
    } catch (err) {
      console.error("Failed to toggle payment token status", err);
      toast.error("Failed to update payment token status");
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
            disabled={loadingVerified}
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
            disabled={loadingVerified}
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
                            {token.symbol && token.symbol !== token.name && (
                              <span className="text-muted-foreground ml-1">
                                ({token.symbol})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Mint: {token.mint}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Program:{" "}
                            {token.programId ===
                            "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
                              ? "Token 2022"
                              : "SPL Token"}
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

              {/* <div className="flex justify-end mt-4"> */}
              <div className="sticky bottom-0 pb-2 flex justify-end">
                <Button
                  className="gradient-primary shadow-lg shadow-black/80"
                  // disabled={!selectedToken}
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
                <th className="p-4 font-medium">Program</th>
                <th className="p-4 font-medium">Decimals</th>
                <th className="p-4 font-medium">Verified</th>
                <th className="p-4 font-medium">Payment Token</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loadingVerified ? (
                <TokenTableSkeleton />
              ) : (
                <>
                  {/* Solana token first - Built-in */}
                  <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors bg-muted/10">
                    <td className="p-4 font-medium">
                      {solanaToken.name}
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Built-in
                      </span>
                    </td>
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
                      <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs">
                        Native
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {solanaToken.decimals}
                    </td>
                    <td className="p-4">
                      <Switch
                        checked={true}
                        disabled={true}
                        title="SOL is always verified"
                      />
                    </td>
                    <td className="p-4">
                      <Switch
                        checked={true}
                        disabled={true}
                        title="SOL is always available for payments"
                      />
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <span className="text-sm">Built-in</span>
                    </td>
                  </tr>

                  {verifiedTokens.map((token) => (
                    <tr
                      key={token.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4 font-medium">
                        {token.name}
                        {token.symbol && token.symbol !== token.name && (
                          <span className="text-muted-foreground ml-1">
                            ({token.symbol})
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          className="flex items-center gap-1 hover:text-primary transition"
                          onClick={() => copyToClipboard(token.address)}
                        >
                          {truncateAddress(token.address)}
                          <Copy className="h-3 w-3 opacity-50 ml-1" />
                        </button>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-md text-xs ${
                            token.programId ===
                            "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {token.programId ===
                          "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
                            ? "Token 2022"
                            : "SPL Token"}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {token.decimals}
                      </td>
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
                        <Switch
                          checked={token.isPaymentToken}
                          onCheckedChange={() =>
                            handleTogglePaymentToken(token.id)
                          }
                          disabled={!token.isVerified}
                          title={
                            !token.isVerified
                              ? "Token must be verified first"
                              : token.isPaymentToken
                                ? "Click to disable for payments"
                                : "Click to enable for payments"
                          }
                        />
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
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
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
