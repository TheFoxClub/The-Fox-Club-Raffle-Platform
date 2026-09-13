import { useState, useEffect } from "react";
import { Plus, Trash2, Copy, RefreshCw } from "lucide-react";
import Button from "../../components/ui/Button";

import { Switch } from "../../components/ui/Switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/Dialog";
import server from "../../config/server";
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
  const [open, setOpen] = useState(false);
  const [tokenMint, setTokenMint] = useState("");
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
      isFeatured: boolean;
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

  const handleInspectTokenMint = async () => {
    const mint = tokenMint.trim();
    if (!mint) {
      toast.error("Enter a token mint address");
      return;
    }

    try {
      setLoading(true);
      const response = await server.get(`/admin/verified-token/inspect/${mint}`);
      const token = response.data?.data?.token;
      if (!response.data?.success || !token) {
        throw new Error(response.data?.message || "Token mint was not found");
      }
      handleSelectToken({
        ...token,
        name: token.name || token.symbol || `Token ${mint.slice(0, 6)}...`,
        symbol: token.symbol || token.name || "",
      });
    } catch (error: any) {
      setSelectedToken(null);
      toast.error(error.response?.data?.message || error.message || "Failed to retrieve token details");
    } finally {
      setLoading(false);
    }
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
      setTokenMint("");
      toast.success("Token added successfully!");
      await fetchVerifiedTokens();
    } catch (err: any) {
      console.error("Failed to create verified token", err);
      toast.error(err.response?.data?.message || "Failed to add token");
    }
  };

  const handleToggleVerify = async (tokenId: number) => {
    try {
      const res = await server.patch(`/admin/verified-token/${tokenId}/toggle-verify`);
      const updatedToken = res.data?.data?.token;
      if (updatedToken) {
        setVerifiedTokens((prev) => prev.map((token) => token.id === updatedToken.id ? updatedToken : token));
        toast.success(updatedToken.isVerified ? "Token verified successfully!" : "Token unverified successfully!");
      }
    } catch (err) {
      console.error("Failed to toggle token verification", err);
    }
  };

  const handleTogglePaymentToken = async (tokenId: number) => {
    try {
      const res = await server.patch(`/admin/verified-token/${tokenId}/toggle-payment`);
      const updatedToken = res.data?.data?.token;
      if (updatedToken) {
        setVerifiedTokens((prev) => prev.map((token) => token.id === updatedToken.id ? updatedToken : token));
        toast.success(updatedToken.isPaymentToken ? "Token enabled for payments!" : "Token disabled for payments!");
      }
    } catch (err) {
      console.error("Failed to toggle payment token status", err);
      toast.error("Failed to update payment token status");
    }
  };

  const handleToggleFeaturedToken = async (tokenId: number) => {
    try {
      const res = await server.patch(`/admin/verified-token/${tokenId}/toggle-featured`);
      const updatedToken = res.data?.data?.token;
      if (updatedToken) {
        setVerifiedTokens((prev) => prev.map((token) => token.id === updatedToken.id ? updatedToken : token));
        toast.success(updatedToken.isFeatured ? "Token featured successfully!" : "Token removed from featured tokens!");
      }
    } catch (err) {
      console.error("Failed to toggle featured token status", err);
      toast.error("Failed to update featured token status");
    }
  };

  const handleDeleteVerifiedToken = async (tokenId: number) => {
    try {
      const res = await server.delete(`/admin/verified-token/${tokenId}`);
      if (res.data?.success) {
        setVerifiedTokens((prev) => prev.filter((token) => token.id !== tokenId));
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
                <DialogTitle>Add Token by Mint</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <label className="block text-sm font-medium">
                  Token mint
                  <input
                    type="text"
                    value={tokenMint}
                    onChange={(event) => setTokenMint(event.target.value.trim())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleInspectTokenMint();
                      }
                    }}
                    placeholder="Enter the Solana token mint address"
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </label>
                <Button type="button" className="w-full" onClick={() => void handleInspectTokenMint()} disabled={loading || !tokenMint}>
                  {loading ? "Fetching token..." : "Fetch Token Details"}
                </Button>

                {selectedToken && (
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="font-semibold">
                      {selectedToken.name}
                      {selectedToken.symbol && selectedToken.symbol !== selectedToken.name && ` (${selectedToken.symbol})`}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">Mint: {selectedToken.mint}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedToken.decimals} decimals, {selectedToken.programId === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" ? "Token 2022" : "SPL Token"}
                    </p>
                  </div>
                )}
              </div>

              {/* <div className="flex justify-end mt-4"> */}
              <div className="sticky bottom-0 pb-2 flex justify-end">
                <Button
                  className="gradient-primary shadow-lg shadow-black/80"
                  disabled={!selectedToken || loading}
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
                <th className="p-4 font-medium">Featured</th>
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
                    <td className="p-4">
                      <Switch checked={false} disabled={true} title="SOL is always prioritized" />
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
                        <Switch
                          checked={token.isFeatured}
                          onCheckedChange={() => handleToggleFeaturedToken(token.id)}
                          disabled={!token.isVerified || !token.isPaymentToken}
                          title={!token.isVerified || !token.isPaymentToken ? "Token must be verified and enabled for payments first" : token.isFeatured ? "Click to remove from featured tokens" : "Click to feature this token"}
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
