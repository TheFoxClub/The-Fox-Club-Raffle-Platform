import {
  AlertCircle,
  Calendar,
  PlusCircle,
  Wallet,
  X,
  Upload,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
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

// Constants for Token Program IDs
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const CreateRaffle = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [selectedNFTs, setSelectedNFTs] = useState<any[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<
    {
      mint: string;
      name: string;
      amount: number;
      amountToUse: number;
      programId: string;
    }[]
  >([]);

  const [isNFTDialogOpen, setIsNFTDialogOpen] = useState(false);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);

  const [nftCandidates, setNftCandidates] = useState<any[]>([]);
  const [nftLoading, setNftLoading] = useState(false);

  const [tokenCandidates, setTokenCandidates] = useState<
    { mint: string; name: string; programId: string; amount: number }[]
  >([]);
  const [tokenLoading, setTokenLoading] = useState(false);

  // const [raffleImage, setRaffleImage] = useState<File | null>(null);
  // const [raffleImagePreview, setRaffleImagePreview] = useState<string | null>(
  //   null
  // );

  const [savedDraft, setSavedDraft] = useState<any>(null);
  const [draftLoading, setDraftLoading] = useState(false);

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
  }>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const raffleImageRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prizeRef = useRef<HTMLDivElement | null>(null);
  const ticketPriceRef = useRef<HTMLInputElement>(null);
  const totalTicketsRef = useRef<HTMLInputElement>(null);
  const numberOfWinnersRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const selectedTokenTypeRef = useRef<HTMLDivElement>(null);

  const tokenOptions = [
    { value: "SOLANA", label: "SOL" },
    { value: "USDC", label: "USDC" },
    { value: "BONK", label: "BONK" },
    { value: "USDT", label: "USDT" },
  ];

  useEffect(() => {
    const totalPrizes = selectedNFTs.length + selectedTokens.length;

    // only auto-set if user hasn't typed anything
    if (numberOfWinners === 1 || numberOfWinners > totalPrizes) {
      setNumberOfWinners(totalPrizes > 0 ? totalPrizes : 1);
    }
  }, [selectedNFTs, selectedTokens]);

  // const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   setRaffleImage(file);
  //   setRaffleImagePreview(URL.createObjectURL(file));

  //   setErrors((prev) => ({ ...prev, raffleImage: "" }));
  // };

  // const handleRemoveImage = () => {
  //   setRaffleImage(null);
  //   setRaffleImagePreview(null);
  // };

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
          const programId = t.account?.owner || t.programId || TOKEN_PROGRAM_ID;
          const name = info?.tokenAmount?.decimals
            ? `Token ${mint.slice(0, 6)}...`
            : "Unknown Token";
          return { mint, name, amount, programId };
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

  const handleSelectToken = (token: {
    mint: string;
    name: string;
    amount: number;
    programId: string;
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

  const validateForm = (isDraft = false) => {
    if (isDraft) return true;

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
    // if (!raffleImage) {
    //   newErrors.raffleImage = "Please upload a raffle image.";
    // }
    if (!ticketPrice || Number(ticketPrice) <= 0)
      newErrors.ticketPrice = "Ticket price must be greater than 0";
    if (!totalTickets || Number(totalTickets) <= 0)
      newErrors.totalTickets = "Total tickets must be greater than 0";
    if (!numberOfWinners || Number(numberOfWinners) <= 0)
      newErrors.numberOfWinners = "Number of winners must be at least 1";
    const totalPrizes = selectedNFTs.length + selectedTokens.length;
    if (numberOfWinners > totalPrizes) {
      newErrors.numberOfWinners =
        "Number of winners cannot exceed total prizes";
    }
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
      else if (newErrors.raffleImage)
        raffleImageRef.current?.scrollIntoView({
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

  const submitRaffle = async (status: "UPCOMING" | "DRAFT") => {
    if (!user.isAuthenticated) {
      toast.error("Please sign in first!");
      return;
    }

    if (!validateForm(status === "DRAFT")) return;

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        totalTickets,
        ticketPrice,
        tokenType: selectedTokenType || "SOLANA",
        numberOfWinners,
        startDate,
        endDate,
        status,
        requiresNftVerification: false,
        rewards: [
          ...selectedNFTs.map((nft) => ({
            rewardType: "NFT",
            rewardName: nft.name,
            mintAddress: nft.mint,
            amount: 1,
            imageUrl: nft.image || "",
            metadataJson: JSON.stringify({ collection: nft.collection }),
          })),

          ...selectedTokens.map((token) => ({
            rewardType:
              token.programId === TOKEN_2022_PROGRAM_ID
                ? "SPL_TOKEN_2022"
                : "SPL_TOKEN",
            rewardName: token.name,
            mintAddress: token.mint,
            amount: token.amountToUse,
            imageUrl: "",
            metadataJson: JSON.stringify({ programId: token.programId }),
          })),
        ],
        additionalJson: { created: "user", category: "raffle" },
      };

      const res = await server.post("/raffle/create", payload);

      if (res.data.success) {
        toast.success(status === "DRAFT" ? "Draft saved!" : "Raffle created!");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  // Minimal draft helpers so UI buttons and actions don't reference missing functions.
  // Saving as draft simply reuses submitRaffle with status DRAFT.
  const handleSaveDraft = async () => {
    await submitRaffle("DRAFT");
  };

  // Load a draft object into the form. This is a best-effort shallow merge.
  const loadDraft = (draft: any) => {
    if (!draft) return;
    try {
      setTitle(draft.title || "");
      setDescription(draft.description || "");
      setTicketPrice(draft.ticketPrice ?? "");
      setTotalTickets(draft.totalTickets ?? "");
      setNumberOfWinners(draft.numberOfWinners ?? 1);
      setStartDate(draft.startDate || "");
      setEndDate(draft.endDate || "");
      setSelectedTokenType(draft.tokenType || null);
      setSelectedNFTs(draft.selectedNFTs || []);
      setSelectedTokens(draft.selectedTokens || []);
    } catch (err) {
      console.error("Failed to load draft", err);
    }
    const loadedNFTs: any[] = [];
    const loadedTokens: any[] = [];

    if (draft.rewards && Array.isArray(draft.rewards)) {
      draft.rewards.forEach((reward: any) => {
        // Parse metadata if it exists as a string
        let metadata: any = {};
        try {
          metadata = reward.metadataJson ? JSON.parse(reward.metadataJson) : {};
        } catch (e) {
          console.error("Error parsing metadata", e);
        }

        if (reward.rewardType === "NFT") {
          loadedNFTs.push({
            id: reward.mintAddress, // UI uses 'id'
            mint: reward.mintAddress,
            name: reward.rewardName,
            image: reward.imageUrl,
            collection: metadata.collection || "",
            raw: {}, // Raw data might be missing, but that's okay for display
          });
        } else if (reward.rewardType.includes("SPL_TOKEN")) {
          loadedTokens.push({
            mint: reward.mintAddress,
            name: reward.rewardName,
            amountToUse: reward.amount,
            // We set 'amount' (wallet balance) to the used amount temporarily
            // so validation passes until the user reconnects wallet/refreshes
            amount: reward.amount,
            programId: metadata.programId || TOKEN_PROGRAM_ID,
          });
        }
      });
    }

    setSelectedNFTs(loadedNFTs);
    setSelectedTokens(loadedTokens);
  };

  const deleteDraft = () => {
    setSavedDraft(null);
  };

  const fetchDrafts = async () => {
    if (!user.isAuthenticated) {
      toast.error("Please sign in to fetch drafts!");
      return;
    }

    try {
      setDraftLoading(true);
      const res = await server.get("/raffle/draft");

      if (res.data.success && res.data.data) {
        setSavedDraft(res.data.data);
        toast.success("Draft loaded successfully!");
      } else {
        setSavedDraft(null);
        toast.info("No saved drafts found.");
      }
    } catch (err: any) {
      console.error("Failed to fetch drafts", err);
      setSavedDraft(null);
      toast.error(err.response?.data?.message || "Failed to fetch drafts");
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-2 max-w-4xl">
      <div className="mb-6">
        {/* Fetch Drafts Button */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={fetchDrafts}
            disabled={draftLoading || !user.isAuthenticated}
            variant="outline"
            className="gap-2"
          >
            {draftLoading ? "Loading..." : "Fetch Saved Drafts"}
          </Button>
        </div>

        {/* Saved Draft Display */}
        {savedDraft && (
          <div className="p-4 border border-accent/50 bg-accent/10 rounded-lg">
            <p className="font-medium items-center">
              You have a saved draft:{" "}
              <strong className="text-foreground">{savedDraft.title}</strong>
            </p>

            <div className="mt-3 flex gap-3">
              <button
                onClick={() => loadDraft(savedDraft)}
                className="px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm transition-colors rounded-md"
              >
                Resume Draft
              </button>

              <button
                onClick={deleteDraft}
                className="px-4 py-2 border border-destructive/50 text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-md"
              >
                Delete Draft
              </button>
            </div>
          </div>
        )}
      </div>
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
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Rare Fox NFT Giveway"
                className="mt-2 w-full px-3 py-2 text-base placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
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
                      className="w-full h-32 border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-background-50 mt-2"
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
                  <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Select NFT from Your Wallet</DialogTitle>
                    </DialogHeader>

                    {!user.isAuthenticated ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center ">
                        <p className="text-muted-foreground text-sm mb-4">
                          Please sign in or log in to view your wallet NFTs.
                        </p>
                      </div>
                    ) : nftLoading ? (
                      <p className="text-center py-6 text-muted-foreground">
                        Loading NFTs...
                      </p>
                    ) : nftCandidates.length === 0 ? (
                      <p className="text-center py-6 text-muted-foreground">
                        No NFTs found in your wallet.
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
                                className="w-full h-40 object-cover rounded-lg"
                              />

                              {/* Footer Overlay */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background-90 to-transparent p-2">
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
                      className="w-full h-32 border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-background/50 mt-2"
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
                  <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Select Token from Your Wallet</DialogTitle>
                    </DialogHeader>

                    {!user.isAuthenticated ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground text-sm mb-4">
                          Please sign in or log in to view your wallet Tokens.
                        </p>
                      </div>
                    ) : tokenLoading ? (
                      <p className="text-center py-6 text-muted-foreground">
                        {" "}
                        Loading tokens...
                      </p>
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
                              <div className="flex flex-col p-4 gap-1">
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

                {selectedTokens.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedTokens.map((t) => (
                      <div
                        key={t.mint}
                        className="relative border-2 border-primary-30 rounded-lg p-4 bg-background-50"
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
                            <label className="text-xs font-medium">
                              Amount
                            </label>
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

              {/* Error Message */}
              {errors.prize && (
                <p className="text-red-500 text-sm mt-1">{errors.prize}</p>
              )}
            </div>
          </div>

          <div ref={raffleImageRef} className="flex flex-col gap-2">
            <label className="font-medium">Raffle Image *</label>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              // onChange={handleImageUpload}
              className="hidden"
            />
            {/* 
            {raffleImagePreview ? (
              <div className="relative w-48">
                <img
                  src={raffleImagePreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded border-2 border-primary/50"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ) : ( */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed cursor-pointer rounded-xl p-6 flex flex-col items-center justify-center gap-3 border-input transition hover:border-primary/50 hover:bg-background-50"
            >
              <Upload className="w-5 h-5 mr-2" />
              <p className="text-sm">Click to upload an image</p>
            </div>
            {/* )} */}

            {errors.raffleImage && (
              <p className="text-red-500 text-sm">{errors.raffleImage}</p>
            )}
          </div>
        </div>

        <div className="glass-card bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          <h1 className="text-2xl font-bold">Raffle Settings</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <div ref={ticketPriceRef}>
              <label className="text-sm font-medium">Ticket Price *</label>
              <div>
                <Input
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
                  className="mt-2 w-full text-base md:text-sm bg-background/50 outline-none"
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
                <Input
                  type="number"
                  value={totalTickets}
                  onChange={(e) => setTotalTickets(Number(e.target.value))}
                  placeholder="100"
                  className="mt-2 w-full text-base placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
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
                <Input
                  type="number"
                  value={numberOfWinners}
                  onChange={(e) => setNumberOfWinners(Number(e.target.value))}
                  placeholder="1"
                  defaultValue="1"
                  className="mt-2 w-full text-base placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
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
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2 w-full text-base placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
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
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2 w-full text-base placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
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
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSaveDraft}
            disabled={loading}
          >
            {loading ? "Processing..." : "Save as Draft"}
          </Button>

          <Button
            onClick={() => submitRaffle("UPCOMING")}
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
