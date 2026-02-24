import { useState, useEffect } from "react";
import { Slider } from "../../components/ui/Slider";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Save, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/Dialog";
//import { useToast } from "../../hooks/use-toast";
import { toast } from "react-toastify";
import server from "../../config/server";

export default function AdminFees() {
  const [holderFee, setHolderFee] = useState([0]);
  const [nonHolderFee, setNonHolderFee] = useState([0]);
  const [txFee, setTxFee] = useState("");
  const [featuredFee, setFeaturedFee] = useState("");
  const isInvalid = holderFee[0] > nonHolderFee[0];
  const [loading, setLoading] = useState(true);
  //const { toast } = useToast();

  // Store original fetched fees to compare changes
  const [originalFees, setOriginalFees] = useState({
    holder: 0,
    nonHolder: 0,
    tx: "",
    featured: "",
  });

  useEffect(() => {
    const fetchFees = async () => {
      try {
        setLoading(true);
        const res = await server.get("/admin/system-fee");

        const data = res.data.data;

        const holder = parseFloat(data.holder_participant_fee);
        const nonHolder = parseFloat(data.non_holder_participant_fee);
        const tx = parseFloat(data.transaction_fee).toString();
        const featured = parseFloat(data.featured_raffle_fee).toString();

        setHolderFee([holder]);
        setNonHolderFee([nonHolder]);
        setTxFee(tx);
        setFeaturedFee(featured);

        //  Save original fees for change detection
        setOriginalFees({
          holder,
          nonHolder,
          tx,
          featured,
        });
      } catch (error) {
        toast.error("Failed to load fee configuration");
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, []);

  const handleSave = async () => {
    try {
      const payload = {
        holder_participant_fee: holderFee[0].toString(),
        non_holder_participant_fee: nonHolderFee[0].toString(),
        transaction_fee: txFee,
        featured_raffle_fee: featuredFee,
      };

      const res = await server.put("/admin/system-fee", payload);

      if (res.data.success) {
        toast.success("Fee configuration saved successfully");
        // Update original fees after successful save
        setOriginalFees({
          holder: holderFee[0],
          nonHolder: nonHolderFee[0],
          tx: txFee,
          featured: featuredFee,
        });
      } else {
        toast.error("Failed to save fee configuration");
      }
    } catch (error) {
      toast.error("Error saving fees");
    }
  };

  if (loading) {
    return <div className="p-6">Loading configuration...</div>;
  }

  const hasChanges =
    holderFee[0] !== originalFees.holder ||
    nonHolderFee[0] !== originalFees.nonHolder ||
    txFee !== originalFees.tx ||
    featuredFee !== originalFees.featured;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Fee & Configuration</h2>
        <p className="text-muted-foreground">
          Adjust global fee and transaction settings
        </p>
      </div>

      {/* Fee Configuration Cards */}
      <div className="space-y-6">
        {/* Holder Fee */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold mb-1">NFT Holder Fee</h3>
              <p className="text-sm text-muted-foreground">
                Lower fee for verified NFT collection holders
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>NFT Holder Fee</DialogTitle>
                  <DialogDescription>
                    This fee applies to users who hold NFTs from verified
                    collections. It incentivizes community participation and
                    rewards holders.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gradient">
                {holderFee[0]}%
              </span>
            </div>
            <Slider
              value={holderFee}
              onValueChange={setHolderFee}
              max={10}
              min={0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>10%</span>
            </div>
          </div>
        </div>
        {isInvalid && (
          <p className="text-sm text-red-500">
            Holder fee cannot exceed standard fee.
          </p>
        )}

        {/* Non-Holder Fee */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Standard Fee</h3>
              <p className="text-sm text-muted-foreground">
                Default fee for non-holder participants
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Standard Fee</DialogTitle>
                  <DialogDescription>
                    This is the default platform fee for users who don't hold
                    verified NFTs.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-gradient">
                {nonHolderFee[0]}%
              </span>
            </div>
            <Slider
              value={nonHolderFee}
              onValueChange={setNonHolderFee}
              max={10}
              min={0}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>10%</span>
            </div>
          </div>
        </div>

        {/* Featured Raffle fee */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Featured Raffle Fee</h3>
              <p className="text-sm text-muted-foreground">
                Flat additional fee applied when raffle is marked as Featured.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fee in SOL</Label>
              <Input
                type="number"
                step="0.01"
                value={featuredFee}
                onChange={(e) => setFeaturedFee(e.target.value)}
                className="text-lg font-semibold mt-1"
              />
            </div>
          </div>
        </div>

        {/* Transaction Fee */}
        <div className="glass-card p-6 rounded-xl border border-border/50">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Transaction Fee</h3>
              <p className="text-sm text-muted-foreground">
                Flat network fee per transaction
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fee in SOL</Label>
              <Input
                type="number"
                step="0.001"
                value={txFee}
                onChange={(e) => setTxFee(e.target.value)}
                className="text-lg font-semibold mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        className="w-full gradient-primary"
        size="lg"
        onClick={handleSave}
        disabled={isInvalid || !hasChanges}
      >
        <Save className="h-4 w-4 mr-2" />
        Save Configuration
      </Button>
    </div>
  );
}
