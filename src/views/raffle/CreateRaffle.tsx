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
import { useNavigate } from "react-router-dom";
import server from "../../config/server";
import { toast } from "react-toastify";
import { useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, Connection, VersionedTransaction } from "@solana/web3.js";

// Constants for Token Program IDs
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

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

  const [raffleImage, setRaffleImage] = useState<File | null>(null);
  const [raffleImagePreview, setRaffleImagePreview] = useState<string | null>(
    null,
  );
  const [imageUploading, setImageUploading] = useState(false);

  const [savedDraft, setSavedDraft] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState<number | "">("");
  const [totalTickets, setTotalTickets] = useState<number | "">("");
  const [numberOfWinners, setNumberOfWinners] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTokenType, setSelectedTokenType] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startNow, setStartNow] = useState(true);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

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
    // { value: "USDT", label: "USDT" },,
  ];

  useEffect(() => {
    if (user.isAuthenticated) {
      fetchDrafts();
    }
  }, [user.isAuthenticated]);

  useEffect(() => {
    const totalPrizes = selectedNFTs.length + selectedTokens.length;

    if (totalPrizes === 0) {
      setNumberOfWinners(1);
      return;
    }

    setNumberOfWinners((prev) => {
      // If rewards were removed, clamp winners
      if (prev > totalPrizes) return totalPrizes;

      // If rewards increased and winners matched old count, auto-increase
      if (prev === totalPrizes - 1) return totalPrizes;

      return prev;
    });
  }, [selectedNFTs.length, selectedTokens.length]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/jpg",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF, WebP)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setRaffleImage(file);
    setRaffleImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, raffleImage: "" }));
  };

  const handleRemoveImage = () => {
    setRaffleImage(null);
    setRaffleImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        const mapped = spl.map((t: any, idx: number) => {
          const info = t.account?.data?.parsed?.info;
          // const mint = info?.mint || `unknown-${idx}`;
          const mint = t.mint;
          // const amount = info?.tokenAmount?.uiAmount ?? 0;
          const amount = t?.amount?.uiAmount ?? 0;
          const programId = t.account?.owner || t.programId || TOKEN_PROGRAM_ID;
          const name = t.metadata?.name || `Token ${mint.slice(0, 6)}...`;
          // const name = info?.tokenAmount?.decimals
          //   ? `Token ${mint.slice(0, 6)}...`
          //   : "Unknown Token";
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
    if (!numberOfWinners || Number(numberOfWinners) <= 0)
      newErrors.numberOfWinners = "Number of winners must be at least 1";
    const totalPrizes = selectedNFTs.length + selectedTokens.length;
    if (numberOfWinners > totalPrizes) {
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

    // Only require image for non-draft submissions
    if (!raffleImage) {
      newErrors.raffleImage = "Please upload a raffle image.";
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

  // ----------------- CREATE RAFFLE CLICK -----------------
  const handleCreateRaffleClick = () => {
    const isValid = validateForm();
    if (!isValid) return; // Stop here if validation fails

    // Open disclaimer modal if valid
    setDisclaimerOpen(true);
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

      let uploadedImageUrl = "";

      // Upload image if provided
      if (raffleImage) {
        try {
          setImageUploading(true);
          const formData = new FormData();
          formData.append("file", raffleImage);

          const uploadRes = await server.post(
            "/upload/raffle-image",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            },
          );

          if (uploadRes.data.success) {
            uploadedImageUrl = uploadRes.data.url;
          } else {
            throw new Error(uploadRes.data.message || "Image upload failed");
          }
        } catch (uploadError: any) {
          toast.error(`Image upload failed: ${uploadError.message}`);
          setLoading(false);
          setImageUploading(false);
          return;
        } finally {
          setImageUploading(false);
        }
      } else if (status !== "DRAFT") {
        // Only require image for non-draft raffles
        toast.error("Please upload a raffle image");
        setLoading(false);
        return;
      }

      const finalStartDate = startNow ? new Date().toISOString() : startDate;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        totalTickets,
        ticketPrice,
        tokenType: selectedTokenType || "SOLANA",
        numberOfWinners,
        startDate: finalStartDate,
        endDate,
        status,
        requiresNftVerification: false,
        imageUrl: uploadedImageUrl,
        rewards: [
          ...selectedNFTs.map((nft) => ({
            rewardType: "NFT",
            rewardName: nft.name,
            mintAddress: nft.mint,
            amount: 1,
            imageUrl: uploadedImageUrl,
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
            imageUrl: uploadedImageUrl,
            metadataJson: JSON.stringify({ programId: token.programId }),
          })),
        ],
        additionalJson: { created: "user", category: "raffle" },
      };

      const draftId = savedDraft?.id || savedDraft?.raffle?.id;
      let res;

      if (status === "DRAFT" && draftId) {
        //UPDATE EXISTING DRAFT
        console.log("Updating existing draft:", draftId);
        res = await server.put(`/raffle/draft/${draftId}`, payload);

        // Drafts don't require reward transfer, so we can finish here
        if (res.data.success) {
          toast.success("Draft saved!");
          await fetchDrafts();
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

            const signedTx = await signTransaction(tx);

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

            // Only NOW create the raffle with proof of successful reward transfer
            res = await server.post("/raffle/create", {
              ...payload,
              rewardTransferSignature: signature,
              rewardTransferData,
            });
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
          res = await server.post("/raffle/create", payload);
        }
      }

      if (res.data.success) {
        toast.success("Raffle created successfully!");
        const createdId = res.data.data.raffle.id;
        navigate(`/raffle/raffle-${createdId}`);
      } else {
        throw new Error(res.data.message || "Failed to create raffle");
      }
    } catch (e: any) {
      console.error("Raffle creation error:", e);
      toast.error(e.response?.data?.message || "Failed to create raffle");
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

      if (draft.imageUrl) {
        setRaffleImagePreview(draft.imageUrl);
      }
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
        const rewardType =
          typeof reward.rewardType === "number"
            ? reward.rewardType === 0
              ? "NFT"
              : "SPL_TOKEN"
            : reward.rewardType;

        if (rewardType === "NFT" || rewardType === 0) {
          loadedNFTs.push({
            id: reward.mintAddress, // UI uses 'id'
            mint: reward.mintAddress,
            name: reward.rewardName,
            image: reward.imageUrl,
            collection: metadata.collection || "",
            raw: {}, // Raw data might be missing, but that's okay for display
          });
        } else if (rewardType.includes("SPL_TOKEN") || rewardType === 1) {
          loadedTokens.push({
            mint: reward.mintAddress,
            name: reward.rewardName,
            amountToUse: Number(reward.amount),
            amount: Number(reward.amount),
            programId: metadata.programId || TOKEN_PROGRAM_ID,
          });
        }
      });
    }

    setSelectedNFTs(loadedNFTs);
    setSelectedTokens(loadedTokens);
  };

  const deleteDraft = async () => {
    console.log("🗑️ Attempting to delete draft:", savedDraft);

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
        console.log("Calling DELETE /raffle/draft/" + draftId);
        // res = await server.delete(`/raffle/draft/${draftId}`);
        res = await server.delete(`/raffle/draft/${draftId}`);
      } else {
        console.log("Calling DELETE /raffle/" + draftId);
        res = await server.delete(`/raffle/${draftId}`);
      }

      console.log("Delete response:", res.data);

      if (res.data.success) {
        // Clear the saved draft state
        setSavedDraft(null);

        setTitle("");
        setDescription("");
        setTicketPrice("");
        setTotalTickets("");
        setNumberOfWinners(1);
        setStartDate("");
        setEndDate("");
        setSelectedTokenType(null);
        setSelectedNFTs([]);
        setSelectedTokens([]);
        setRaffleImage(null);
        setRaffleImagePreview(null);
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

          <div ref={raffleImageRef} className="flex flex-col gap-2">
            <label className="font-medium">Raffle Image *</label>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />

            {raffleImagePreview ? (
              <div className="relative w-full max-w-md">
                <img
                  src={raffleImagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg border-2 border-primary/50"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white text-xs p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed cursor-pointer rounded-xl p-6 flex flex-col items-center justify-center gap-3 border-input transition hover:border-primary/50 hover:bg-background-50"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload an image</p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, GIF, WebP (max 5MB)
                </p>
              </div>
            )}

            {imageUploading && (
              <p className="text-sm text-blue-500">Uploading image...</p>
            )}

            {errors.raffleImage && (
              <p className="text-red-500 text-sm">{errors.raffleImage}</p>
            )}
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
                  min={1}
                  max={selectedNFTs.length + selectedTokens.length}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    const max = selectedNFTs.length + selectedTokens.length;

                    setNumberOfWinners(Math.min(Math.max(1, value), max));

                    setErrors((prev) => ({
                      ...prev,
                      numberOfWinners: undefined,
                    }));
                  }}
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
            {loading ? "Creating..." : "Create Raffle"}
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
