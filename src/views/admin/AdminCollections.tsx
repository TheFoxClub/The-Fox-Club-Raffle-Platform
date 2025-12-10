import { useState, useEffect } from "react";
import {
  Plus,
  CheckCircle,
  XCircle,
  Edit,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
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

// const mockCollections = [
//   {
//     id: 1,
//     name: "Fox Club Genesis",
//     mint: "FoxC...xyz1",
//     verified: true,
//     floor: "12.5 SOL",
//   },
//   {
//     id: 2,
//     name: "Den Pass Collection",
//     mint: "DenP...abc2",
//     verified: true,
//     floor: "8.2 SOL",
//   },
//   {
//     id: 3,
//     name: "Golden Foxes",
//     mint: "Gold...def3",
//     verified: false,
//     floor: "15.8 SOL",
//   },
//   {
//     id: 4,
//     name: "Silver Den",
//     mint: "Silv...ghi4",
//     verified: true,
//     floor: "5.5 SOL",
//   },
// ];
interface Collection {
  id: number;
  name: string;
  // mint: string;
  verified: boolean;
  floor: string;
}

export default function AdminCollections() {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [verifyCollection, setVerifyCollection] = useState(true);
  const [saving, setSaving] = useState(false);

  // FETCH VERIFIED COLLECTIONS
  // MOVE fetchCollections OUTSIDE useEffect
  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await server.get("/admin/verified-collection");

      setCollections(
        Array.isArray(res.data?.data?.collections)
          ? res.data.data.collections.map((c: any) => ({
              id: c.id,
              name: c.address,
              verified: true,
              floor: "-", // placeholder
            }))
          : []
      );
    } catch (err) {
      console.error("Error fetching collections:", err);
    } finally {
      setLoading(false);
    }
  };

  // FETCH ON COMPONENT MOUNT
  useEffect(() => {
    fetchCollections();
  }, []);

  const handleAddCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error("Collection name is required");
      return;
    }
    try {
      setSaving(true);

      const res = await server.post("/admin/verified-collection", {
        addresses: [newCollectionName],
        verified: verifyCollection,
        blockchainNetwork: "solana",
      });

      if (res.data.success) {
        toast.success("Collection added successfully!");

        fetchCollections();
        setOpen(false);

        setNewCollectionName("");
        setVerifyCollection(true);
      } else {
        toast.error(res.data.message || "Failed to add collection");
      }
    } catch (error: any) {
      console.error("Error adding collection:", error);
      toast.error(error.response?.data?.message || "Error adding collection");
    } finally {
      setSaving(false);
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;

        const addresses = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line);

        if (addresses.length === 0) {
          toast.error("CSV is empty or invalid");
          setUploading(false);
          return;
        }

        const res = await server.post(
          "/admin/verified-collection?blockchainNetwork=solana",
          { addresses }
        );

        if (res.data.success) {
          toast.success("CSV uploaded successfully!");
          // REFRESH COLLECTIONS
          fetchCollections();
        } else {
          toast.error(res.data.message || "Error uploading CSV");
        }
      } catch (err: any) {
        console.error(
          "Error uploading CSV:",
          err.response?.data || err.message
        );
        toast.error(err.response?.data?.message || "Error uploading CSV");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verified Collections</h2>
          <p className="text-muted-foreground">
            Manage NFT collections that can host raffles
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Collection Name</Label>
                <Input
                  placeholder="Fox Club Genesis"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
                <Switch
                  checked={verifyCollection}
                  onCheckedChange={setVerifyCollection}
                />
              </div>
              {/* <div className="space-y-2">
                <Label>Mint Address</Label>
                <Input placeholder="FoxC...xyz1" />
              </div> */}
              <div className="flex items-center justify-between">
                <Label>Verify Immediately</Label>
                <Switch defaultChecked />
              </div>
              <Button
                className="w-full gradient-primary"
                onClick={handleAddCollection}
                disabled={saving}
              >
                {saving ? "Adding..." : "Add Collection"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* CSV UPLOAD SECTION */}
      <div className="glass-card border border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          </div>

          {/* File Input */}
          <label className="mt-4 cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="gradient-primary px-4 py-2 rounded-lg text-white flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Browse / Upload CSV"}
            </div>
          </label>
        </div>
      </div>

      {/* Collections Grid */}
      {loading ? (
        <p className="text-center text-muted-foreground py-10">
          Loading collections...
        </p>
      ) : collections.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No verified collections found.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* {collections.map((collection: any) => ( */}
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="glass-card p-6 rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:glow-primary flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-16 w-16 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
                  <span className="text-2xl">🦊</span>
                </div>
                {collection.verified ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <h3 className="font-semibold text-base mb-2 line-clamp-2 overflow-hidden text-ellipsis break-all">
                {collection.name}
              </h3>

              {/* <p className="text-xs text-muted-foreground mb-3">
                {collection.mint}
              </p>
              <p className="text-sm text-primary font-medium mb-4">
                Floor: {collection.floor}
              </p> */}

              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex-1" size="sm">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Switch defaultChecked={collection.verified} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
