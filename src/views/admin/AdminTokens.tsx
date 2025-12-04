import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
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

const mockTokens = [
  { id: 1, name: "Solana", symbol: "SOL", decimals: 9, fee: 2.5, active: true },
  { id: 2, name: "USD Coin", symbol: "USDC", decimals: 6, fee: 2.5, active: true },
  { id: 3, name: "Bonk", symbol: "BONK", decimals: 5, fee: 3.0, active: true },
  { id: 4, name: "Orca", symbol: "ORCA", decimals: 6, fee: 3.0, active: false },
];

export default function AdminTokens() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Token Management</h2>
          <p className="text-muted-foreground">Configure supported tokens and their fees</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Token</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Token Name</Label>
                <Input placeholder="Solana" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input placeholder="SOL" />
                </div>
                <div className="space-y-2">
                  <Label>Decimals</Label>
                  <Input type="number" placeholder="9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fee Percentage</Label>
                <Input type="number" step="0.1" placeholder="2.5" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch defaultChecked />
              </div>
              <Button className="w-full gradient-primary" onClick={() => setOpen(false)}>
                Add Token
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tokens Table */}
      <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/50">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Token Name</th>
                <th className="p-4 font-medium">Symbol</th>
                <th className="p-4 font-medium">Decimals</th>
                <th className="p-4 font-medium">Fee %</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockTokens.map((token) => (
                <tr key={token.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-medium">{token.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {token.symbol}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{token.decimals}</td>
                  <td className="p-4">
                    <span className="text-accent font-medium">{token.fee}%</span>
                  </td>
                  <td className="p-4">
                    <Switch defaultChecked={token.active} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
