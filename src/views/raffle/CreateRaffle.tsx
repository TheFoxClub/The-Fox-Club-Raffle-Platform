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
import { useState } from "react";
import { mockWalletNFTs } from "../../dummydata/WalletNFTs";
import { useNavigate } from "react-router-dom";
import server from "../../config/server";
import { toast } from "react-toastify";

const CreateRaffle = () => {
  const navigate = useNavigate();
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [isNFTDialogOpen, setIsNFTDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState<number | "">("");
  const [totalTickets, setTotalTickets] = useState<number | "">("");
  const [numberOfWinners, setNumberOfWinners] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tokenOptions = [
    { value: "SOL", label: "SOL" },
    { value: "USDC", label: "USDC" },
    { value: "BONK", label: "BONK" },
    { value: "USDT", label: "USDT" },
  ];

  const handleSelectNFT = (nft: any) => {
    setSelectedNFT(nft);
    setIsNFTDialogOpen(false);
  };

  const validateForm = () => {
    if (!selectedNFT) return toast.error("Please select an NFT.");
    if (!title.trim()) return toast.error("Title is required.");
    if (!description.trim()) return toast.error("Description is required.");
    if (!ticketPrice || Number(ticketPrice) <= 0)
      return toast.error("Ticket price must be greater than 0.");
    if (!totalTickets || Number(totalTickets) <= 0)
      return toast.error("Total tickets must be greater than 0.");
    if (!numberOfWinners || Number(numberOfWinners) <= 0)
      return toast.error("Number of winners must be at least 1.");
    if (Number(numberOfWinners) > Number(totalTickets))
      return toast.error("Number of winners cannot exceed total tickets.");
    if (!startDate || !endDate)
      return toast.error("Start and end dates are required.");

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) return toast.error("Start date must be before end date.");
    if (start < new Date())
      return toast.error("Start date cannot be in the past.");
    if (!selectedToken) return toast.error("Please select a token type.");
    return null;
  };

  const handleCreateRaffle = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        imageUrl: selectedNFT?.image,
        totalTickets: Number(totalTickets),
        ticketPrice: Number(ticketPrice),
        tokenType: selectedToken,
        numberOfWinners,
        startDate,
        endDate,
        requiresNftVerification: false,
        verifiedCollectionRequired: selectedNFT?.collection,
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
        <div className="glass-card p-4 space-y-2 rounded-lg border border-accent-30 bg-card shadow-sm mb-6">
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

        <div className="glass-card border bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          <h1 className="text-2xl font-bold">Basic Information</h1>

          <div>
            <label className="text-sm font-medium">Raffle Title *</label>
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Rare Fox NFT Giveway"
                className="border border-input rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50"
              />
            </div>
          </div>

          <div>
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
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2">Prize NFT *</label>
            {selectedNFT ? (
              <div className="relative border-2 border-primary-30 rounded-lg p-4 bg-background-50">
                <button
                  type="button"
                  onClick={() => setSelectedNFT(null)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background-80 hover:bg-destructive-80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex gap-4 items-center">
                  <img
                    src={selectedNFT.image}
                    alt={selectedNFT.name}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-semibold">{selectedNFT.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedNFT.collection}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mint: {selectedNFT.mint}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Dialog open={isNFTDialogOpen} onOpenChange={setIsNFTDialogOpen}>
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Select NFT from Your Wallet</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                    {mockWalletNFTs.map((nft) => (
                      <button
                        key={nft.id}
                        type="button"
                        onClick={() => handleSelectNFT(nft)}
                        className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-all hover:scale-105"
                      >
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background-90 to-transparent p-3">
                          <p className="font-semibold text-sm">{nft.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {nft.collection}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="glass-card border bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          <h1 className="text-2xl font-bold">Raffle Settings</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Ticket Price *</label>
              <div>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(Number(e.target.value))}
                  placeholder="0.5"
                  step="0.01"
                  className="border border-input rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Token Type *</label>
              <Select
                options={tokenOptions}
                value={selectedToken}
                onValueChange={setSelectedToken}
                className="bg-background-50 mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Total Tickets *</label>
              <div>
                <input
                  type="number"
                  value={totalTickets}
                  onChange={(e) => setTotalTickets(Number(e.target.value))}
                  placeholder="100"
                  className="border border-input rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Number of Winners *</label>
              <div>
                <input
                  type="number"
                  value={numberOfWinners}
                  onChange={(e) => setNumberOfWinners(Number(e.target.value))}
                  placeholder="1"
                  defaultValue="1"
                  className="border border-input rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card border bg-card rounded-lg border border-border shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Duration</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium">Start Date & Time *</label>
              <div>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-input rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">End Date & Time *</label>
              <div>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-input rounded-lg mt-2 w-full px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground md:text-sm bg-background-50"
                />
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
