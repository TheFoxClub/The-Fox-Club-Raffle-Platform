import { AlertCircle, Calendar, PlusCircle, Wallet, X } from "lucide-react";
import Button from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Textarea";
import Select from "../../components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/Dialog";
import { useState, useEffect } from "react";
// import { mockWalletNFTs } from "../../dummydata/WalletNFTs";
import { useNavigate } from "react-router-dom";
import server from "../../config/server";
import { toast } from "react-toastify";
import { useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";

const CreateRaffle = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [selectedNFTs, setSelectedNFTs] = useState<any[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<
    { mint: string; name: string; amount: number; amountToUse: number }[]
  >([]);

  const [isNFTDialogOpen, setIsNFTDialogOpen] = useState(false);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);

  const [nftCandidates, setNftCandidates] = useState<any[]>([]);
  const [nftLoading, setNftLoading] = useState(false);

  const [tokenCandidates, setTokenCandidates] = useState<
    { mint: string; name: string; amount: number }[]
  >([]);
  const [tokenLoading, setTokenLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState<number | "">("");
  const [totalTickets, setTotalTickets] = useState<number | "">("");
  const [numberOfWinners, setNumberOfWinners] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTokenType, setSelectedTokenType] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{
    [key: string]: string | undefined;
    title?: string;
    description?: string;
    prize?: string;
    selectedNFT?: string;
    selectedToken?: string;
    ticketPrice?: string;
    totalTickets?: string;
    numberOfWinners?: string;
    startDate?: string;
    endDate?: string;
    selectedTokenType?: string;
    startDateError?: string;
    endDateError?: string;
  }>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const prizeRef = useRef<HTMLDivElement | null>(null);
  const ticketPriceRef = useRef<HTMLInputElement>(null);
  const totalTicketsRef = useRef<HTMLInputElement>(null);
  const numberOfWinnersRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const selectedTokenTypeRef = useRef<HTMLDivElement>(null);

  const tokenOptions = [
    { value: "SOL", label: "SOL" },
    { value: "USDC", label: "USDC" },
    { value: "BONK", label: "BONK" },
    { value: "USDT", label: "USDT" },
  ];

  const handleSelectNFT = (nft: any) => {
    if (!selectedNFTs.some((item) => item.id === nft.id)) {
      setSelectedNFTs((prev) => [...prev, nft]);
    }
    // setIsNFTDialogOpen(false);
    setErrors((prev) => ({
      ...prev,
      selectedNFT: undefined,
      prize: undefined,
    }));
  };

  const removeNFT = (id: any) => {
    setSelectedNFTs((prev) => prev.filter((i) => i.id !== id));
  };

  //fetch NFTs when NFT dialog opens
  useEffect(() => {
    if (!isNFTDialogOpen) return;

    const fetchNfts = async () => {
      if (!user?.pubkey) {
        setNftCandidates([]);
        return;
      }
      try {
        setNftLoading(true);
        const res = await server.get(`/nfts/${user.pubkey}`);
        const nftsFromApi: any[] = res.data?.data?.nfts || [];

        const mapped = await Promise.all(
          nftsFromApi.map(async (nftItem: any, idx: number) => {
            const mint = nftItem.mint ?? `unknown-${idx}`;
            let name = nftItem.name ?? `NFT ${mint.slice(0, 6)}...`;
            let collection =
              (nftItem.grouping && nftItem.grouping[0]?.group_value) || "";
            let image: string | undefined = undefined;

            const uri = nftItem.uri || nftItem.uri?.toString?.();
            if (uri) {
              try {
                const metaRes = await fetch(uri);
                if (metaRes.ok) {
                  const meta = await metaRes.json();
                  if (meta.image) image = meta.image;
                  if (meta.name) name = meta.name;
                  if (!collection && meta.collection)
                    collection = meta.collection;
                }
              } catch (err) {}
            }
            return {
              id: mint,
              mint,
              name,
              collection,
              image,
              raw: nftItem,
            };
          })
        );

        setNftCandidates(mapped);
      } catch (err) {
        console.error("Failed to fetch NFTs", err);
        setNftCandidates([]);
      } finally {
        setNftLoading(false);
      }
    };
    fetchNfts();
  }, [isNFTDialogOpen, user?.pubkey]);

  //fetch tokens when token modal opens(and user present)
  useEffect(() => {
    if (!isTokenDialogOpen) return;
    const fetchTokens = async () => {
      if (!user?.pubkey) {
        setTokenCandidates([]);
        return;
      }

      try {
        setTokenLoading(true);
        const res = await server.get(`/tokens/${user.pubkey}`);
        const spl = res.data?.message?.splTokens || [];
        const mapped = spl.map((t: any, idx: number) => {
          const info = t.account?.data?.parsed?.info;
          const mint = info?.mint || `unknown-${idx}`;
          const amount = info?.tokenAmount?.uiAmount ?? 0;
          const name = info?.tokenAmount?.decimals
            ? `Token ${mint.slice(0, 6)}...`
            : "Unknown Token";
          return { mint, name, amount };
        });
        setTokenCandidates(mapped);
      } catch (err) {
        console.error("Failed to fetch tokens", err);
        setTokenCandidates([]);
      } finally {
        setTokenLoading(false);
      }
    };

    fetchTokens();
  }, [isTokenDialogOpen, user?.pubkey]);

  const handleSelectToken = (token: {
    mint: string;
    name: string;
    amount: number;
  }) => {
    if (!selectedTokens.some((t) => t.mint === token.mint)) {
      setSelectedTokens((prev) => [...prev, { ...token, amountToUse: 0 }]);
    }
    setErrors((prev) => ({
      ...prev,
      selectedToken: undefined,
      prize: undefined,
      [`token-${token.mint}`]: undefined,
    }));
  };

  const removeToken = (mint: string) => {
    setSelectedTokens((prev) => prev.filter((t) => t.mint !== mint));
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (selectedNFTs.length === 0 && selectedTokens.length === 0) {
      newErrors.prize = "Please select at least one NFT or token";
    }

    selectedTokens.forEach((t) => {
      if (t.amountToUse <= 0) {
        newErrors[`token-${t.mint}`] = "Amount must be greater than 0";
      }
      if (t.amountToUse > t.amount) {
        newErrors[
          `token-${t.mint}`
        ] = `Cannot exceed available amount (${t.amount})`;
      }
    });

    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!ticketPrice || Number(ticketPrice) <= 0)
      newErrors.ticketPrice = "Ticket price must be greater than 0";
    if (!totalTickets || Number(totalTickets) <= 0)
      newErrors.totalTickets = "Total tickets must be greater than 0";
    if (!numberOfWinners || Number(numberOfWinners) <= 0)
      newErrors.numberOfWinners = "Number of winners must be at least 1";
    if (Number(numberOfWinners) > Number(totalTickets))
      newErrors.numberOfWinners = "Cannot exceed total tickets";
    if (!startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";
    if (!selectedTokenType)
      newErrors.selectedTokenType = "Please select a token";

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      newErrors.endDateError = "End date must be after start date";
    }

    if (start < new Date()) {
      newErrors.startDateError = "Start date cannot be in the past";
    }

    setErrors(newErrors);
    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.title)
        titleRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.description)
        descriptionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.prize)
        prizeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.ticketPrice)
        ticketPriceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.totalTickets)
        totalTicketsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.numberOfWinners)
        numberOfWinnersRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.startDate || newErrors.startDateError)
        startDateRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.endDate || newErrors.endDateError)
        endDateRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else if (newErrors.selectedTokenType)
        selectedTokenTypeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleCreateRaffle = async () => {
    // Check if user is logged in
    if (!user.isAuthenticated) {
      toast.error("Please sign in first to create a raffle!");
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        images: selectedNFTs.map((nft) => nft.image),
        totalTickets: Number(totalTickets),
        ticketPrice: Number(ticketPrice),
        tokenType: selectedTokenType,
        numberOfWinners,
        startDate,
        endDate,
        requiresNftVerification: false,
        verifiedCollections: selectedNFTs.map((nft) => nft.collection),
        tokens: selectedTokens.map((t) => ({
          mint: t.mint,
          amount: t.amountToUse,
        })),
        additionalJson: {
          created: "user",
          category: "raffle",
          notes: "",
        },
      };

      const res = await server.post("/raffle/create", payload);

      if (res.data.success) {
        toast.success(res.data.message);

        // Access the created raffle
        const createdRaffle = res.data.data.raffle;
        console.log("Created raffle ID:", createdRaffle.id);

        // Navigate to raffle detail page if needed
        navigate(`/raffle/${createdRaffle.id}`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create raffle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-2 max-w-4xl">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gradient mb-2">
          Create New Raffle
        </h1>
        <p className="text-medium mb-6 text-muted-foreground">
          Launch your own raffle and engage the community
        </p>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-4 space-y-2 rounded-lg border border-accent/30 bg-card shadow-sm mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-accent" />
            <span text-sm font-medium>
              Platform Fees
            </span>
          </div>
          <div className="flex gap-4 ml-7">
            <div>
              <span className="text-sm">NFT Holders:</span>
              <span className="text-sm text-accent font-bold"> 2.5%</span>
            </div>
            <div>
              <span className="text-sm">Regular Users:</span>
              <span className="text-sm text-accent font-bold"> 5%</span>
            </div>
          </div>
        </div>

        <div className="glass-card border bg-card rounded-lg border-border shadow-sm p-6 space-y-6">
          <h1 className="text-2xl font-bold">Basic Information</h1>

          <div ref={titleRef}>
            <label className="text-sm font-medium">Raffle Title *</label>
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Rare Fox NFT Giveway"
                className="border focus:border-primary border-input rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>
          </div>

          <div ref={descriptionRef}>
            <label htmlFor="Description" className="text-sm font-medium">
              Description *
            </label>
            <div>
              <Textarea
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
                placeholder="Describe your raffle, prizes, and any special conditions..."
                rows={5}
                className="bg-background-50 mt-2"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>
          </div>

          <div ref={prizeRef}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2">Prize NFT *</label>

                {/* Select Button (Always Visible) */}
                <Dialog
                  open={isNFTDialogOpen}
                  onOpenChange={setIsNFTDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 border-2 border-dashed hover:border-primary-50 hover:bg-background-50"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="h-8 w-8" />
                        <span className="font-semibold">
                          Choose NFT from Wallet
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Select from verified collections
                        </span>
                      </div>
                    </Button>
                  </DialogTrigger>

                  {/* Modal */}
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Select NFT from Your Wallet</DialogTitle>
                    </DialogHeader>

                    {nftLoading ? (
                      <p className="text-center py-6 text-muted-foreground">
                        Loading NFTs...
                      </p>
                    ) : nftCandidates.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">
                        No NFTs found in your wallet
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                        {nftCandidates.map((nft) => {
                          const isSelected = selectedNFTs.some(
                            (item) => item.id === nft.id
                          );

                          return (
                            <button
                              key={nft.id}
                              type="button"
                              onClick={() =>
                                !isSelected && handleSelectNFT(nft)
                              }
                              disabled={isSelected}
                              className={`
                group relative overflow-hidden rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? "border-green-500 opacity-50 cursor-not-allowed"
                    : "border-border hover:border-primary hover:scale-105"
                }
              `}
                            >
                              <img
                                src={nft.image}
                                alt={nft.name}
                                className="w-full aspect-square object-cover"
                              />

                              {/* Footer Overlay */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background-90 to-transparent p-3">
                                <p className="font-semibold text-sm truncate">
                                  {nft.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {nft.collection}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {nft.mint}
                                </p>
                              </div>

                              {/* Selected Badge */}
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
                        onClick={() => setIsNFTDialogOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div>
                <label className="text-sm font-medium mb-2">
                  Prize Token *
                </label>
                <Dialog
                  open={isTokenDialogOpen}
                  onOpenChange={setIsTokenDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 border-2 border-dashed hover:border-primary-50 hover:bg-background-50"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="h-8 w-8" />
                        <span className="font-semibold">
                          Choose Token from Wallet
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Select from verified collections
                        </span>
                      </div>
                    </Button>
                  </DialogTrigger>

                  {/* Modal */}
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Select Token from Your Wallet</DialogTitle>
                    </DialogHeader>

                    {tokenLoading ? (
                      <p> Loading tokens...</p>
                    ) : tokenCandidates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground text-sm">
                          No tokens found in your wallet
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                        {tokenCandidates.map((token) => {
                          const isSelected = selectedTokens.some(
                            (t) => t.mint === token.mint
                          );

                          return (
                            <button
                              key={token.mint}
                              type="button"
                              onClick={() =>
                                !isSelected && handleSelectToken(token)
                              }
                              disabled={isSelected}
                              className={`
                group relative overflow-hidden rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? "border-green-500 opacity-50 cursor-not-allowed"
                    : "border-border hover:border-primary hover:scale-105"
                }
              `}
                            >
                              <div className="flex flex-col gap-1">
                                <p className="font-semibold text-sm truncate">
                                  {token.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  Mint: {token.mint}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  Amount: {token.amount}
                                </p>
                              </div>

                              {/* Selected Badge */}
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
                        onClick={() => setIsTokenDialogOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Error Message */}
              {errors.prize && (
                <p className="text-red-500 text-sm mt-1">{errors.prize}</p>
              )}

              {/* ---------------- SELECTED NFT LIST ---------------- */}
              {selectedNFTs.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedNFTs.map((nft) => (
                    <div
                      key={nft.id}
                      className="relative border-2 border-primary-30 rounded-lg p-4 bg-background-50"
                    >
                      {/* Remove Single NFT */}
                      <button
                        type="button"
                        onClick={() => removeNFT(nft.id)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background-80 hover:bg-destructive-80 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <div className="flex gap-4 items-center">
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-semibold break-words break-all">
                            {nft.name}
                          </p>
                          <p className="text-sm text-muted-foreground break-words break-all">
                            {nft.collection}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 break-words break-all">
                            Mint: {nft.mint}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTokens.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedTokens.map((t) => (
                    <div
                      key={t.mint}
                      className="absolute top-2 right-2 p-1 rounded-full bg-background-80 hover:bg-destructive-80 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => removeToken(t.mint)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background-80 hover:bg-destructive-80 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="flex flex-col gap-2 break-all">
                        <div className="flex-1">
                          <p className="font-semibold break-all">{t.name}</p>
                          <p className="text-xs text-muted-foreground break-all">
                            Mint: {t.mint}
                          </p>
                          <p className="text-xs text-muted-foreground break-all">
                            Amount: {t.amount}
                          </p>
                        </div>

                        <div className="flex flex-col">
                          <label className="text-xs font-medium">Amount</label>
                          <input
                            type="number"
                            value={t.amountToUse}
                            min={0}
                            max={t.amount}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setSelectedTokens((prev) =>
                                prev.map((token) =>
                                  token.mint === t.mint
                                    ? { ...token, amountToUse: value }
                                    : token
                                )
                              );
                              // Clear error if any
                              setErrors((prev) => ({
                                ...prev,
                                [`token-${t.mint}`]: undefined,
                              }));
                            }}
                            placeholder="Amount to use"
                            className="border border-input rounded-lg mt-1 w-full px-3 py-2 text-sm bg-background-50 outline-none"
                          />
                          {errors[`token-${t.mint}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors[`token-${t.mint}`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          <h1 className="text-2xl font-bold">Raffle Settings</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <div ref={ticketPriceRef}>
              <label className="text-sm font-medium">Ticket Price *</label>
              <div>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => {
                    setTicketPrice(Number(e.target.value));
                    setErrors((prev) => ({
                      ...prev,
                      ticketPrice: undefined,
                    }));
                  }}
                  placeholder="0.5"
                  step="0.01"
                  className="border border-input focus:border-primary rounded-lg mt-2 w-full px-3 py-2 text-base md:text-sm bg-background/50 outline-none"
                />
                {errors.ticketPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.ticketPrice}
                  </p>
                )}
              </div>
            </div>

            <div ref={selectedTokenTypeRef}>
              <label className="text-sm font-medium">Token Type *</label>
              <Select
                options={tokenOptions}
                value={selectedTokenType}
                onValueChange={(val) => {
                  setSelectedTokenType(val);
                  setErrors((prev) => ({
                    ...prev,
                    selectedTokenType: undefined,
                  }));
                }}
                className="bg-background-50 mt-2"
              />
              {errors.selectedTokenType && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.selectedTokenType}
                </p>
              )}
            </div>

            <div ref={totalTicketsRef}>
              <label className="text-sm font-medium">Total Tickets *</label>
              <div>
                <input
                  type="number"
                  value={totalTickets}
                  onChange={(e) => setTotalTickets(Number(e.target.value))}
                  placeholder="100"
                  className="border border-input focus:border-primary rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
                />
                {errors.totalTickets && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.totalTickets}
                  </p>
                )}
              </div>
            </div>

            <div ref={numberOfWinnersRef}>
              <label className="text-sm font-medium">Number of Winners *</label>
              <div>
                <input
                  type="number"
                  value={numberOfWinners}
                  onChange={(e) => setNumberOfWinners(Number(e.target.value))}
                  placeholder="1"
                  defaultValue="1"
                  className="border border-input focus:border-primary rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
                />
                {errors.numberOfWinners && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.numberOfWinners}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Duration</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div ref={startDateRef}>
              <label className="text-sm font-medium">Start Date & Time *</label>
              <div>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-input focus:border-primary rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
                />
                {errors.startDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.startDate}
                  </p>
                )}
                {errors.startDateError && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.startDateError}
                  </p>
                )}
              </div>
            </div>

            <div ref={endDateRef}>
              <label className="text-sm font-medium">End Date & Time *</label>
              <div>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-input focus:border-primary rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
                />
                {errors.endDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
                )}
                {errors.endDateError && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.endDateError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button variant="outline" className="w-full">
            Save as Draft
          </Button>

          <Button
            onClick={handleCreateRaffle}
            variant="default"
            className="w-full gradient-primary glow-primary gap-2"
            disabled={loading}
          >
            <PlusCircle className="h-4 w-4" />
            {loading ? "Creating..." : "Create Raffle"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateRaffle;
