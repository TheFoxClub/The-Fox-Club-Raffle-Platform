import { AlertCircle, Calendar, PlusCircle, Wallet, X } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import server from "../../config/server";
import { toast } from "react-toastify";
import { useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, Connection, VersionedTransaction } from "@solana/web3.js";
import { getVerifiedPaymentTokens } from "./api";
import { formatPrice } from "../../helpers/formatPrice";
import { normalizeIpfs } from "../../helpers/ipfs";
import TOKEN_PLACEHOLDER from "../../../public/uploads/token-placeholder.png";
import NFT_PLACEHOLDER from "../../../public/uploads/nft-placeholder.svg";

// Constants for Token Program IDs
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const normalizeRewardType = (rewardType: any) => {
  if (rewardType === 0 || rewardType === "NFT") return "NFT";
  if (
    rewardType === 1 ||
    rewardType === "SPL_TOKEN" ||
    rewardType === "SPL_TOKEN_2022"
  )
    return "SPL_TOKEN";

  return null;
};

const CreateRaffle = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const { publicKey, signTransaction, connected } = useWallet();

  const [selectedNFTs, setSelectedNFTs] = useState<any[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<
    {
      mint: string;
      name: string;
      amount: number;
      amountToUse: number;
      programId: string;
      image?: string | null;
    }[]
  >([]);

  const [isNFTDialogOpen, setIsNFTDialogOpen] = useState(false);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);

  const [nftCandidates, setNftCandidates] = useState<any[]>([]);
  const [nftLoading, setNftLoading] = useState(false);

  const [tokenCandidates, setTokenCandidates] = useState<
    {
      mint: string;
      name: string;
      programId: string;
      amount: number;
      image?: string | null;
    }[]
  >([]);
  const [tokenLoading, setTokenLoading] = useState(false);

  // const [raffleImage, setRaffleImage] = useState<File | null>(null);
  // const [raffleImagePreview, setRaffleImagePreview] = useState<string | null>(
  //   null,
  // );
  // const [imageUploading, setImageUploading] = useState(false);

  const [savedDraft, setSavedDraft] = useState<any>(null);
  const [isResumingDraft, setIsResumingDraft] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState<number | "">("");
  const [totalTickets, setTotalTickets] = useState<number | "">("");
  // const [numberOfWinners, setNumberOfWinners] = useState(1);
  const [numberOfWinners, setNumberOfWinners] = useState<number | "">(1);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTokenType, setSelectedTokenType] = useState<any>(null);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [startNow, setStartNow] = useState(true);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const maxWinners = selectedNFTs.length + selectedTokens.length;

  // Dynamic token options state
  const [tokenOptions, setTokenOptions] = useState<
    { value: string; label: string; decimals: number; tokenType: number }[]
  >([]);
  const [tokenOptionsLoading, setTokenOptionsLoading] = useState(true);

  const [errors, setErrors] = useState<{
    [key: string]: string | undefined;
  }>({});

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prizeRef = useRef<HTMLDivElement | null>(null);
  const ticketPriceRef = useRef<HTMLInputElement>(null);
  const totalTicketsRef = useRef<HTMLInputElement>(null);
  const numberOfWinnersRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const selectedTokenTypeRef = useRef<HTMLDivElement>(null);

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

          // setTokenOptions(tokens);

          const uniqueTokens = Array.from(
            new Map(tokens.map((t) => [t.value, t])).values(),
          );

          setTokenOptions(uniqueTokens);

          // Set default to SOL if available
          const solToken = tokens.find((t: any) => t.tokenType === 0);
          if (solToken && !selectedTokenType) {
            setSelectedTokenType(solToken);
            setSelectedTokenAddress(solToken.value);
          }
        } else {
          // console.warn("No tokens found in API response, using fallback");
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
          if (!selectedTokenType) {
            setSelectedTokenType(fallbackTokens[0]);
            setSelectedTokenAddress(fallbackTokens[0].value);
          }
        }
      } catch (error) {
        console.error("Failed to fetch payment tokens:", error);
        toast.error("Failed to load payment options");
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
        if (!selectedTokenType) {
          setSelectedTokenType(fallbackTokens[0]);
          setSelectedTokenAddress(fallbackTokens[0].value);
        }
      } finally {
        setTokenOptionsLoading(false);
      }
    };

    fetchPaymentTokens();
  }, []);

  useEffect(() => {
    if (user.isAuthenticated) {
      fetchDrafts();
    }
  }, [user.isAuthenticated]);

  // useEffect(() => {
  //   const totalPrizes = selectedNFTs.length + selectedTokens.length;

  //   if (totalPrizes === 0) {
  //     setNumberOfWinners(1);
  //     return;
  //   }

  //   setNumberOfWinners((prev) => {
  //     const prevValue = typeof prev === "number" ? prev : 1;
  //     if (prevValue > totalPrizes) return totalPrizes;

  //     // If rewards increased and winners matched old count, auto-increase
  //     if (prevValue === totalPrizes - 1) return totalPrizes;

  //     return prevValue;
  //   });
  // }, [selectedNFTs.length, selectedTokens.length]);
  useEffect(() => {
    if (maxWinners === 0) {
      setNumberOfWinners(1);
      return;
    }

    setNumberOfWinners((prev) => {
      const prevValue = typeof prev === "number" ? prev : 1;

      if (prevValue > maxWinners) return maxWinners;
      if (prevValue === maxWinners - 1) return maxWinners;

      return prevValue;
    });
  }, [maxWinners]);

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
        // const res = await server.get(`/nfts/onCollection`);
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
          }),
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
        // const res = await server.get(`/tokens/${user.pubkey}`);
        const res = await server.get(`/tokens/verified`);
        const spl = res.data?.message?.splTokens || [];
        // const mapped = spl.map((t: any) => {
        //   const info = t.account?.data?.parsed?.info;
        // const mint = info?.mint || `unknown-${idx}`;
        const mapped = await Promise.all(
          spl.map(async (t: any, idx: number) => {
            const mint = t.mint;
            // const amount = info?.tokenAmount?.uiAmount ?? 0;
            const amount = t?.amount?.uiAmount ?? 0;
            const programId =
              t.account?.owner || t.programId || TOKEN_PROGRAM_ID;
            let name =
              t.metadata?.name ||
              t.metadata?.symbol ||
              `Token ${mint.slice(0, 6)}...`;
            let image: string | null = null;
            const uri = t.metadata?.uri;

            if (uri) {
              const normalized = normalizeIpfs(uri);

              try {
                const res = await fetch(normalized);

                const contentType = res.headers.get("content-type") || "";

                // CASE 1 — direct image
                if (contentType.startsWith("image/")) {
                  image = normalized;
                }

                // CASE 2 — metadata JSON
                else if (contentType.includes("application/json")) {
                  const meta = await res.json();
                  image = normalizeIpfs(
                    meta?.image || meta?.logoURI || meta?.image_url,
                  );

                  if (!t.metadata?.name && meta?.name) {
                    name = meta.name;
                  }
                }
              } catch (err) {
                console.warn("Token metadata fetch failed:", normalized);
              }
            }

            return {
              mint,
              name,
              image,
              amount,
              programId,
            };
          }),
        );

        setTokenCandidates(mapped);
        console.log("Token candidates:", mapped);
      } catch (err) {
        console.error("Failed to fetch tokens", err);
        setTokenCandidates([]);
      } finally {
        setTokenLoading(false);
      }
    };

    fetchTokens();
  }, [isTokenDialogOpen, user?.pubkey]);

  useEffect(() => {
    if (selectedTokens.length === 0 || tokenCandidates.length === 0) return;

    setSelectedTokens((prev) =>
      prev.map((selected) => {
        const walletToken = tokenCandidates.find(
          (t) => t.mint === selected.mint,
        );

        return walletToken
          ? {
              ...selected,
              amount: walletToken.amount,
            }
          : selected;
      }),
    );
  }, [tokenCandidates]);

  useEffect(() => {
    if (!isResumingDraft) return;
    if (selectedTokens.length === 0) return;

    // reuse the same fetch logic
    (async () => {
      if (!user?.pubkey) return;

      try {
        setTokenLoading(true);
        const res = await server.get(`/tokens/verified`);
        const spl = res.data?.message?.splTokens || [];

        const mapped = await Promise.all(
          spl.map(async (t: any, idx: number) => {
            const mint = t.mint;
            // const amount = info?.tokenAmount?.uiAmount ?? 0;
            const amount = t?.amount?.uiAmount ?? 0;
            const programId =
              t.account?.owner || t.programId || TOKEN_PROGRAM_ID;
            let name =
              t.metadata?.name ||
              t.metadata?.symbol ||
              `Token ${mint.slice(0, 6)}...`;
            let image: string | null = null;
            const uri = t.metadata?.uri;
            if (uri) {
              try {
                const res = await fetch(normalizeIpfs(uri)!);
                if (res.ok) {
                  const meta = await res.json();
                  if (meta?.image) {
                    image = normalizeIpfs(meta.image);
                  }
                  if (!t.metadata?.name && meta?.name) {
                    name = meta.name;
                  }
                }
              } catch (err) {
                console.warn("Failed to fetch token metadata:", uri);
              }
            }

            return {
              mint,
              name,
              image,
              amount,
              programId,
            };
          }),
        );

        setTokenCandidates(mapped);
      } catch (err) {
        console.error("Failed to fetch tokens", err);
        setTokenCandidates([]);
      } finally {
        setTokenLoading(false);
      }
    })();
  }, [isResumingDraft, selectedTokens.length, user?.pubkey]);

  const handleSelectNFT = (nft: any) => {
    if (!selectedNFTs.some((item) => item.id === nft.id)) {
      setSelectedNFTs((prev) => [...prev, nft]);
      //  showRewardDisclaimer("nft");
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
    image?: string | null;
  }) => {
    if (!selectedTokens.some((t) => t.mint === token.mint)) {
      setSelectedTokens((prev) => [...prev, { ...token, amountToUse: 0 }]);
      //   showRewardDisclaimer("token");
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

  // ---------- TOGGLE NFT ----------
  const toggleNFT = (nft: any) => {
    setSelectedNFTs((prev) => {
      const exists = prev.some((item) => item.id === nft.id);
      return exists
        ? prev.filter((item) => item.id !== nft.id)
        : [...prev, nft];
    });

    setErrors((prev) => ({
      ...prev,
      selectedNFT: undefined,
      prize: undefined,
    }));
  };

  // ---------- TOGGLE TOKEN ----------
  const toggleToken = (token: {
    mint: string;
    name: string;
    amount: number;
    programId: string;
    image?: string | null;
  }) => {
    setSelectedTokens((prev) => {
      const exists = prev.some((t) => t.mint === token.mint);
      return exists
        ? prev.filter((t) => t.mint !== token.mint)
        : [...prev, { ...token, amountToUse: 0 }];
    });

    setErrors((prev) => ({
      ...prev,
      selectedToken: undefined,
      prize: undefined,
      [`token-${token.mint}`]: undefined,
    }));
  };

  // 🔹 AUTO-SET START DATE WHEN startNow IS TRUE
  useEffect(() => {
    if (startNow) {
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setStartDate(localISO);
    }
  }, [startNow]);

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
        newErrors[`token-${t.mint}`] =
          `Cannot exceed available amount (${t.amount})`;
      }
    });

    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!ticketPrice || Number(ticketPrice) <= 0) {
      newErrors.ticketPrice = "Ticket price must be greater than 0";
    } else {
      // Check for max 3 decimal places
      const decimalPart = ticketPrice.toString().split(".")[1];
      if (decimalPart && decimalPart.length > 3) {
        newErrors.ticketPrice =
          "Ticket price cannot have more than 3 decimal places";
      }
    }

    if (!totalTickets || Number(totalTickets) <= 0)
      newErrors.totalTickets = "Total tickets must be greater than 0";
    const winners = typeof numberOfWinners === "number" ? numberOfWinners : 0;

    const totalPrizes = selectedNFTs.length + selectedTokens.length;

    if (winners < 1) {
      newErrors.numberOfWinners = "Number of winners must be at least 1";
    }

    if (winners > totalPrizes) {
      newErrors.numberOfWinners =
        "Number of winners cannot exceed total prizes";
    }

    if (!startNow && !startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";
    if (!selectedTokenType)
      newErrors.selectedTokenType = "Please select a token";

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      newErrors.endDateError = "End date must be after start date";
    }

    if (!startNow) {
      if (start < new Date()) {
        newErrors.startDateError = "Start date cannot be in the past";
      }
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

  // ----------------- CREATE RAFFLE CLICK -----------------
  const handleCreateRaffleClick = () => {
    const isValid = validateForm();
    if (!isValid) return; // Stop here if validation fails

    // Open disclaimer modal if valid
    setDisclaimerOpen(true);
  };

  const isBlockheightExceededError = (error: any) => {
    const msg =
      error?.message?.toLowerCase?.() ||
      error?.toString?.().toLowerCase?.() ||
      "";

    return (
      msg.includes("blockheight exceeded") ||
      msg.includes("block height exceeded") ||
      msg.includes("transactionexpired") ||
      msg.includes("blockhash not found")
    );
  };

  const withTimeout = <T,>(
    promise: Promise<T>,
    ms: number,
    message = "Wallet approval timed out",
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(message));
      }, ms);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const getRaffleImageFromRewards = () => {
    if (selectedNFTs.length > 0) {
      return selectedNFTs[0].image || NFT_PLACEHOLDER;
    }

    if (selectedTokens.length > 0) {
      return selectedTokens[0].image || TOKEN_PLACEHOLDER;
    }

    return null;
  };

  // ----------------- FINAL SUBMIT AFTER DISCLAIMER -----------------
  const handleDisclaimerConfirm = () => {
    if (!disclaimerAccepted) {
      toast.error("You must agree to the terms to proceed.");
      return;
    }
    setDisclaimerOpen(false);
    submitRaffle("UPCOMING");
  };

  const submitRaffle = async (status: "UPCOMING" | "DRAFT") => {
    if (!user.isAuthenticated) {
      toast.error("Please sign in first!");
      return;
    }

    if (!connected || !publicKey || !signTransaction) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!validateForm(status === "DRAFT")) return;

    try {
      setLoading(true);
      const raffleImageUrl = getRaffleImageFromRewards();

      const finalStartDate = startNow ? new Date().toISOString() : startDate;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        totalTickets,
        ticketPrice,
        tokenType: selectedTokenType?.tokenType || 0,
        tokenAddress: selectedTokenType?.value || null,
        numberOfWinners,
        startDate: finalStartDate,
        endDate,
        status,
        requiresNftVerification: false,
        imageUrl: raffleImageUrl,
        rewards: [
          ...selectedNFTs.map((nft) => ({
            rewardType: "NFT",
            rewardName: nft.name,
            mintAddress: nft.mint,
            amount: 1,
            imageUrl: nft.image || NFT_PLACEHOLDER,
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
            imageUrl: token.image || TOKEN_PLACEHOLDER,
            metadataJson: JSON.stringify({ programId: token.programId }),
          })),
        ],
        additionalJson: { created: "user", category: "raffle" },
      };

      const draftId = isResumingDraft
        ? savedDraft?.id || savedDraft?.raffle?.id
        : null;

      let res;

      if (status === "DRAFT" && draftId) {
        //UPDATE EXISTING DRAFT
        console.log("Updating existing draft:", draftId);
        res = await server.put(`/raffle/draft/${draftId}`, payload);

        // Drafts don't require reward transfer, so we can finish here
        if (res.data.success) {
          toast.success("Draft saved!");
          await fetchDrafts();
          // Reset the resuming flag since we've successfully updated the draft
          setIsResumingDraft(false);
        }
        return;
      } else if (status === "DRAFT") {
        // CREATE NEW DRAFT - No reward transfer needed
        res = await server.post("/raffle/create", payload);

        if (res.data.success) {
          toast.success("Draft saved!");
          await fetchDrafts();
          // Reset the resuming flag since we've successfully created a new draft
          setIsResumingDraft(false);
        }
        return;
      } else {
        const hasRewards = selectedNFTs.length > 0 || selectedTokens.length > 0;

        if (hasRewards) {
          // Get reward transfer transaction WITHOUT creating raffle
          const transferRes = await server.post(
            "/raffle/prepare-reward-transfer",
            {
              rewards: payload.rewards,
              fromAddress: publicKey.toString(),
            },
          );

          if (!transferRes.data.success) {
            throw new Error(
              transferRes.data.message || "Failed to prepare reward transfer",
            );
          }

          const { transaction, rewardTransferData } = transferRes.data.data;

          toast.info("Please sign the reward transfer transaction...");

          try {
            let tx;
            let isVersioned = false;
            try {
              // Try legacy transaction first (for standard NFTs)
              const txBytes = Uint8Array.from(atob(transaction), (c) =>
                c.charCodeAt(0),
              );
              tx = Transaction.from(txBytes);
              isVersioned = false;
            } catch (error) {
              try {
                // Fallback to versioned transaction (for MPL Core NFTs)
                const txBytes = Uint8Array.from(atob(transaction), (c) =>
                  c.charCodeAt(0),
                );
                tx = VersionedTransaction.deserialize(txBytes);
                isVersioned = true;
              } catch (versionedError) {
                console.error(
                  "Failed to deserialize transaction:",
                  error,
                  versionedError,
                );
                throw new Error("Failed to deserialize transaction");
              }
            }

            let signedTx;
            try {
              signedTx = await signTransaction(tx);
            } catch (signError) {
              console.error("Transaction signing failed:", signError);

              // Try to provide more specific error messages
              if (signError.message?.includes("insufficient")) {
                throw new Error(
                  "Insufficient balance to transfer rewards. Please check your token balance.",
                );
              } else if (signError.message?.includes("account")) {
                throw new Error(
                  "Token account not found. Please ensure you own the tokens you're trying to transfer.",
                );
              } else if (signError.message?.includes("rejected")) {
                throw new Error("Transaction was rejected by wallet.");
              } else {
                throw new Error(
                  `Transaction signing failed: ${signError.message || "Unknown error"}`,
                );
              }
            }

            let serializedTransaction;
            if (isVersioned) {
              serializedTransaction = Buffer.from(
                signedTx.serialize(),
              ).toString("base64");
            } else {
              serializedTransaction = Buffer.from(
                signedTx.serialize(),
              ).toString("base64");
            }

            const connection = new Connection(
              import.meta.env.VITE_SOLANA_RPC_HOST ||
                "https://api.devnet.solana.org",
            );

            let signature;
            try {
              const txBytes = Buffer.from(serializedTransaction, "base64");
              signature = await connection.sendRawTransaction(txBytes, {
                skipPreflight: true, // Skip preflight to avoid signature verification issues
                maxRetries: 3, // Allow retries
                preflightCommitment: "processed",
              });

              const confirmation = await connection.confirmTransaction(
                {
                  signature,
                  blockhash: (await connection.getLatestBlockhash()).blockhash,
                  lastValidBlockHeight: (await connection.getLatestBlockhash())
                    .lastValidBlockHeight,
                },
                "confirmed",
              );

              if (confirmation.value.err) {
                throw new Error(
                  `Transaction failed: ${JSON.stringify(
                    confirmation.value.err,
                  )}`,
                );
              }
            } catch (submitError: any) {
              console.error("Transaction submission failed:", submitError);

              if (isBlockheightExceededError(submitError)) {
                toast.error("Blockheight Exceeded. Please try again.");
                return;
              }
              if (submitError.getLogs) {
                try {
                  const logs = await submitError.getLogs();
                  console.error("DEBUG: Transaction logs:", logs);
                } catch (logError) {
                  console.error("DEBUG: Failed to get logs:", logError);
                }
              }

              try {
                const simulation =
                  await connection.simulateTransaction(signedTx);
                console.error(
                  "DEBUG: Simulation accounts:",
                  simulation.value.accounts,
                );
              } catch (simError) {
                console.error("DEBUG: Simulation failed:", simError);
              }

              throw submitError;
            }

            // Create raffle with proof of successful reward transfer
            // If there's a draft, convert it to live raffle; otherwise create new raffle
            const createPayload = {
              ...payload,
              rewardTransferSignature: signature,
              rewardTransferData,
            };

            // Add draftId if converting existing draft
            if (draftId) {
              createPayload.draftId = draftId;
            }

            res = await server.post("/raffle/create", createPayload);
          } catch (signError: any) {
            console.error("Reward transfer failed:", signError);
            if (signError.message?.includes("rejected")) {
              toast.error("Reward transfer was rejected by wallet");
            } else if (
              signError.message?.includes(
                "Programmable NFTs (pNFTs) are not currently supported",
              )
            ) {
              toast.error(
                "Programmable NFTs (pNFTs) are not supported yet. Please use Legacy NFTs instead.",
              );
            } else if (
              signError.message?.includes(
                "MPL Core NFTs are not currently supported",
              )
            ) {
              toast.error(
                "MPL Core NFTs are not supported yet. Please use Legacy NFTs instead.",
              );
            } else if (
              signError.message?.includes(
                "Mixed reward types (NFT + SPL tokens) are not currently supported",
              )
            ) {
              toast.error(
                "Mixed rewards (NFT + SPL tokens) are not supported yet. Please use either NFTs only or SPL tokens only.",
              );
            } else {
              toast.error(`Reward transfer failed: ${signError.message}`);
            }
            return; // Don't create raffle if reward transfer failed
          }
        } else {
          // No rewards, create raffle directly
          // If there's a draft, convert it to live raffle; otherwise create new raffle
          const createPayload = { ...payload };

          // Add draftId if converting existing draft
          if (draftId) {
            createPayload.draftId = draftId;
          }

          res = await server.post("/raffle/create", createPayload);
        }
      }

      if (res.data.success) {
        toast.success("Raffle created successfully!");
        const createdId = res.data.data.raffle.id;
        // Reset the resuming flag since we've successfully created/converted the raffle
        setIsResumingDraft(false);
        navigate(`/raffle/raffle-${createdId}`);
      } else {
        throw new Error(res.data.message || "Failed to create raffle");
      }
    } catch (e: any) {
      console.error("Raffle creation error:", e);
      toast.error(e.response?.data?.message || "Failed to create raffle");
      // Reset the resuming flag on error so user can try again
      setIsResumingDraft(false);
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

    // Mark that we're resuming a draft
    setIsResumingDraft(true);

    try {
      setTitle(draft.title || "");
      setDescription(draft.description || "");
      // setTicketPrice(draft.ticketPrice ?? "");
      setTicketPrice(
        draft.ticketPrice !== undefined && draft.ticketPrice !== null
          ? Number(formatPrice(draft.ticketPrice))
          : "",
      );
      setTotalTickets(draft.totalTickets ?? "");
      setNumberOfWinners(draft.numberOfWinners ?? 1);
      setStartDate(draft.startDate || "");
      setEndDate(draft.endDate || "");
      setSelectedTokenType(draft.tokenType || null);
    } catch (err) {
      console.error("Failed to load draft", err);
    }
    const loadedNFTs: any[] = [];
    const loadedTokens: any[] = [];

    const rewards = draft.raffle_rewards || draft.rewards || [];

    if (Array.isArray(rewards)) {
      rewards.forEach((reward: any) => {
        // Parse metadata if it exists as a string
        let metadata: any = {};
        try {
          metadata = reward.metadataJson ? JSON.parse(reward.metadataJson) : {};
        } catch (e) {
          console.error("Error parsing metadata", e);
        }

        // Handle rewardType as both string and number (based on your response)
        const type = normalizeRewardType(reward.rewardType);

        if (type === "NFT") {
          loadedNFTs.push({
            id: reward.mintAddress, // UI uses 'id'
            mint: reward.mintAddress,
            name: reward.rewardName,
            image: reward.imageUrl,
            collection: metadata.collection || "",
            raw: {},
          });
        }

        if (type === "SPL_TOKEN") {
          loadedTokens.push({
            mint: reward.mintAddress,
            name: reward.rewardName,
            amountToUse: Number(reward.amount),
            image: reward.imageUrl,
            // amount: Number(reward.amount),
            amount: 0,
            programId: metadata.programId || TOKEN_PROGRAM_ID,
          });
        }
      });
    }

    setSelectedNFTs(loadedNFTs);
    setSelectedTokens(loadedTokens);
  };

  const deleteDraft = async () => {
    const raffleData = savedDraft?.raffle || savedDraft;
    const draftId = raffleData?.id;
    const status = raffleData?.status;

    if (!draftId) {
      console.log("No draft ID found:", savedDraft);
      toast.error("No draft to delete");
      return;
    }

    try {
      let res;

      if (status === "DRAFT") {
        // res = await server.delete(`/raffle/draft/${draftId}`);
        res = await server.delete(`/raffle/draft/${draftId}`);
      } else {
        res = await server.delete(`/raffle/${draftId}`);
      }

      console.log("Delete response:", res.data);

      if (res.data.success) {
        // Clear the saved draft state
        setSavedDraft(null);
        // Reset the resuming flag since draft is deleted
        setIsResumingDraft(false);

        setTitle("");
        setDescription("");
        setTicketPrice("");
        setTotalTickets("");
        setNumberOfWinners(1);
        setStartDate("");
        setEndDate("");
        setSelectedTokenType(null);
        setSelectedTokenAddress("");
        setSelectedNFTs([]);
        setSelectedTokens([]);

        setErrors({});
        // setRewardDisclaimerShown({ nft: false, token: false });

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        toast.success("Draft deleted successfully!");
      } else {
        toast.error(res.data.message || "Failed to delete draft");
      }
    } catch (err: any) {
      console.error("Failed to delete draft", err);

      const errorMsg =
        err.response?.data?.message || err.message || "Failed to delete draft";
      toast.error(errorMsg);
    }
  };

  const fetchDrafts = async () => {
    if (!user.isAuthenticated) {
      setSavedDraft(null);
      return;
    }

    try {
      const res = await server.get("/raffle/draft");

      if (res.data.success && res.data.data) {
        const draftData = res.data.data.raffle || res.data.data;

        if (draftData && draftData.id) {
          console.log("Valid draft found:", draftData);
          setSavedDraft(draftData);
        } else {
          console.log("No valid draft ID found");
          setSavedDraft(null);
        }
      } else {
        console.log("No draft data in response");
        setSavedDraft(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch drafts", err);
      setSavedDraft(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-2 max-w-4xl">
      <div className="mb-6">
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
                className="px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm transition-colors rounded-md cursor-pointer"
              >
                Resume Draft
              </button>

              <button
                onClick={deleteDraft}
                className="px-4 py-2 border border-destructive/50 text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-md cursor-pointer"
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
        <div className=" p-4 space-y-2 rounded-lg border border-accent/30 bg-card shadow-sm mb-6">
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

        <div className=" border bg-card rounded-lg border-border shadow-sm p-6 space-y-6">
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
                  <DialogContent className="max-w-2xl mx-2 max-h-[70vh] overflow-y-auto">
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
                      <div className="grid grid-cols-2 gap-4">
                        {nftCandidates.map((nft) => {
                          const isSelected = selectedNFTs.some(
                            (item) => item.id === nft.id,
                          );

                          return (
                            <button
                              key={nft.id}
                              type="button"
                              onClick={() => toggleNFT(nft)}
                              className={`
                group relative overflow-hidden rounded-lg border-2 transition-all w-full h-40 flex
                ${
                  isSelected
                    ? "border-green-500 ring-2 ring-green-500"
                    : "border-border hover:border-primary hover:scale-105"
                }
              `}
                            >
                              <img
                                src={nft.image}
                                alt={nft.name}
                                className="w-full h-full object-cover"
                              />

                              {/* Footer Overlay */}
                              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-background via-background-90 to-transparent p-2">
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
                    <div className="sticky bottom-0 pb-2 flex justify-end">
                      <Button
                        className="gradient-primary shadow-lg shadow-black/80"
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
                            <p className="font-semibold wrap-break-word break-all">
                              {nft.name}
                            </p>
                            <p className="text-sm text-muted-foreground wrap-break-word break-all">
                              {nft.collection}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 wrap-break-word break-all">
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
                  <DialogContent className="max-w-2xl mx-2 max-h-[70vh] overflow-y-auto">
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
                        Loading tokens...
                      </p>
                    ) : tokenCandidates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground text-sm">
                          No tokens found in your wallet
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {tokenCandidates.map((token) => {
                          const isSelected = selectedTokens.some(
                            (t) => t.mint === token.mint,
                          );

                          return (
                            <button
                              key={token.mint}
                              type="button"
                              onClick={() => toggleToken(token)}
                              className={`
                                      group relative overflow-hidden rounded-lg border-2 transition-all flex items-center w-full h-16 px-3 py-2
                                      ${
                                        isSelected
                                          ? "border-green-500 ring-2 ring-green-500"
                                          : "border-border hover:border-primary hover:scale-105"
                                      }
                                    `}
                            >
                              {/* Left icon / badge */}
                              {/* <div className="shrink-0 w-10 h-10 rounded-md bg-background-60 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                {token.name?.charAt(0) ??
                                  token.mint?.slice(0, 1)}
                              </div> */}

                              {/* Content */}
                              <div className="flex-1 min-w-0">
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

                    <div className="sticky bottom-0 pb-2 flex justify-end">
                      <Button
                        className="gradient-primary shadow-lg shadow-black/80"
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
                                      : token,
                                  ),
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
        </div>

        <div className=" bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
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
                value={selectedTokenAddress}
                onValueChange={(tokenAddress) => {
                  const selectedToken = tokenOptions.find(
                    (t) => t.value === tokenAddress,
                  );
                  setSelectedTokenType(selectedToken);
                  setSelectedTokenAddress(tokenAddress);
                  setErrors((prev) => ({
                    ...prev,
                    selectedTokenType: undefined,
                  }));
                }}
                className="bg-background-50 mt-2"
                disabled={tokenOptionsLoading}
                placeholder={
                  tokenOptionsLoading
                    ? "Loading payment options..."
                    : "Select payment token"
                }
              />
              {errors.selectedTokenType && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.selectedTokenType}
                </p>
              )}
              {tokenOptionsLoading && (
                <p className="text-muted-foreground text-sm mt-1">
                  Loading available payment tokens...
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
                  min={1}
                  max={selectedNFTs.length + selectedTokens.length}
                  step={1}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setNumberOfWinners("");
                      return;
                    }
                    const num = Number(value);
                    if (isNaN(num)) return;

                    setNumberOfWinners(num);

                    setErrors((prev) => ({
                      ...prev,
                      numberOfWinners: undefined,
                    }));
                  }}
                  onBlur={() => {
                    if (numberOfWinners === "") {
                      setNumberOfWinners(1);
                      return;
                    }

                    if (numberOfWinners < 1) {
                      setNumberOfWinners(1);
                    } else if (numberOfWinners > maxWinners) {
                      setNumberOfWinners(maxWinners);
                    }
                  }}
                  className="mt-2 w-full text-base placeholder:text-muted-foreground md:text-sm bg-background-50 outline-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max winners: {maxWinners}
                </p>
                {errors.numberOfWinners && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.numberOfWinners}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className=" bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Duration</h1>
          </div>

          {/* 🔹 START IMMEDIATELY TOGGLE */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={startNow}
              onChange={(e) => setStartNow(e.target.checked)}
              className="h-4 w-4"
            />
            <label className="text-sm font-medium">Start immediately</label>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div ref={startDateRef}>
              <label className="text-sm font-medium">Start Date & Time *</label>
              <div>
                <Input
                  type="datetime-local"
                  value={startDate}
                  disabled={startNow}
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
            className="w-full cursor-pointer"
            onClick={handleSaveDraft}
            disabled={loading}
          >
            {loading ? "Processing..." : "Save as Draft"}
          </Button>

          <Button
            onClick={handleCreateRaffleClick}
            variant="default"
            className="w-full gradient-primary glow-primary gap-2"
            disabled={loading}
          >
            <PlusCircle className="h-4 w-4" />
            {loading ? "Creating Raffle.." : "Create Raffle"}
          </Button>
        </div>
      </div>

      {/* ================= DISCLAIMER MODAL ================= */}
      <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Important: Irreversible Action
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>By creating this raffle:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Selected NFT(s) and/or token rewards will be immediately
                transferred and permanently locked
              </li>
              <li>
                Locked rewards will not be refunded, even if zero tickets are
                purchased
              </li>
              <li>
                Once any ticket is purchased, the raffle cannot be cancelled or
                deleted
              </li>
              <li>
                Raffle details cannot be changed after creation, including
                dates, ticket price, ticket supply, or rewards
              </li>
            </ul>
          </div>

          <label className="flex items-start gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              I understand and agree to the above terms
            </span>
          </label>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDisclaimerOpen(false)}>
              Cancel
            </Button>

            <Button
              className="gradient-primary"
              onClick={handleDisclaimerConfirm}
            >
              Confirm & Lock Rewards
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ===================================================== */}
    </div>
  );
};

export default CreateRaffle;
