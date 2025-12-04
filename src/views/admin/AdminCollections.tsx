import { useState } from "react";
import { Plus, CheckCircle, XCircle, Edit } from "lucide-react";
import Button  from "../../components/ui/Button";
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

const mockCollections = [
  { id: 1, name: "Fox Club Genesis", mint: "FoxC...xyz1", verified: true, floor: "12.5 SOL" },
  { id: 2, name: "Den Pass Collection", mint: "DenP...abc2", verified: true, floor: "8.2 SOL" },
  { id: 3, name: "Golden Foxes", mint: "Gold...def3", verified: false, floor: "15.8 SOL" },
  { id: 4, name: "Silver Den", mint: "Silv...ghi4", verified: true, floor: "5.5 SOL" },
];

export default function AdminCollections() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Verified Collections</h2>
          <p className="text-muted-foreground">Manage NFT collections that can host raffles</p>
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
                <Input placeholder="Fox Club Genesis" />
              </div>
              <div className="space-y-2">
                <Label>Mint Address</Label>
                <Input placeholder="FoxC...xyz1" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Verify Immediately</Label>
                <Switch defaultChecked />
              </div>
              <Button className="w-full gradient-primary" onClick={() => setOpen(false)}>
                Add Collection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCollections.map((collection) => (
          <div
            key={collection.id}
            className="glass-card p-6 rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:glow-primary"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-16 w-16 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
                <span className="text-2xl">🦊</span>
              </div>
              {collection.verified ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <h3 className="font-bold mb-1">{collection.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{collection.mint}</p>
            <p className="text-sm text-primary font-medium mb-4">Floor: {collection.floor}</p>

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
    </div>
  );
}
