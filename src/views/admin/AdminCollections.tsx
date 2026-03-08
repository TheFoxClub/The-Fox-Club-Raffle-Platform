import { useState, useEffect, useRef } from "react";
import {
  Plus,
  CheckCircle,
  XCircle,
  Edit,
  Upload,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
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

interface Collection {
  id: number;
  name: string;
  address: string;
  verified: boolean;
}

export default function AdminCollections() {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionAddress, setNewCollectionAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetchingName, setFetchingName] = useState(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deletingCollection, setDeletingCollection] =
    useState<Collection | null>(null);

  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk delete states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewCollectionAddress(value);

    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);

    if (value.trim().length < 32) {
      setFetchingName(false);
      return;
    }

    addressDebounceRef.current = setTimeout(async () => {
      try {
        setFetchingName(true);
        const res = await server.get("/admin/collection-name/lookup", {
          params: { address: value.trim() },
        });
        const name = res.data?.data?.name;
        if (name) setNewCollectionName(name);
      } catch {
        // silently ignore — admin can still type the name manually
      } finally {
        setFetchingName(false);
      }
    }, 700);
  };

  // FETCH VERIFIED COLLECTIONS
  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await server.get("/admin/verified-collection");
      setCollections(
        Array.isArray(res.data?.data?.collections)
          ? res.data.data.collections.map((c: any) => ({
              id: c.id,
              name: c.name,
              address: c.address,
              verified: c.isVerified,
            }))
          : []
      );
    } catch (err) {
      console.error("Error fetching collections:", err);
      toast.error("Failed to refresh collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleAddCollection = async () => {
    if (!newCollectionName.trim() || !newCollectionAddress.trim()) {
      toast.error("Collection name and address are required");
      return;
    }
    try {
      setSaving(true);
      const res = await server.post("/admin/verified-collection", {
        address: newCollectionAddress,
        name: newCollectionName,
      });
      if (res.data?.data?.collection) {
        toast.success("Collection added successfully!");
        fetchCollections();
        setOpen(false);
        setNewCollectionName("");
        setNewCollectionAddress("");
      } else {
        toast.error(res.data?.message || "Failed to add collection");
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
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await server.post(
        "/admin/verified-collection/bulk-upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data?.success) {
        toast.success("CSV uploaded successfully!");
        fetchCollections();
        const results = res.data?.data?.results;
        if (results?.duplicates?.length) {
          toast.info(
            `${results.duplicates.length} duplicate entries were skipped`
          );
        }
      } else {
        toast.error(res.data?.message || "CSV upload failed");
      }
    } catch (err: any) {
      console.error("CSV upload error:", err);
      toast.error(err.response?.data?.message || "CSV upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleToggleVerify = async (id: number) => {
    try {
      const res = await server.patch(
        `/admin/verified-collection/${id}/toggle-verify`
      );
      const updatedCollection = res.data?.data?.collection;
      if (!updatedCollection) throw new Error("Invalid response");
      setCollections((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, verified: updatedCollection.isVerified } : c
        )
      );
      if (updatedCollection.isVerified) {
        toast.success("Collection is now verified!");
      } else {
        toast.info("Collection is no longer verified.");
      }
    } catch (error) {
      console.error("Toggle verify failed:", error);
      toast.error("Failed to update verification status");
    }
  };

  // --- Single Delete ---
  const handleDeleteCollection = async (id: number) => {
    try {
      const res = await server.delete(`/admin/verified-collection/${id}`);
      if (res.data?.success) {
        toast.success(res.data.message || "Collection deleted successfully");

        setCollections((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete collection");
    }
  };

  // --- Bulk Delete ---
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      const res = await server.delete(
        "/admin/verified-collection/bulk/delete",
        { data: { ids: selectedIds } }
      );
      if (res.data?.success) {
        toast.success(
          res.data.message ||
            `${selectedIds.length} collection(s) deleted successfully`
        );
        setCollections((prev) =>
          prev.filter((c) => !selectedIds.includes(c.id))
        );
        setSelectedIds([]);
        setBulkMode(false);
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete collections");
    }
  };

  // --- Checkbox selection handler ---
  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedIds([]);
  };

  // --- Edit collection ---
  const handleEditCollection = async () => {
    if (!editingCollection) return;
    if (!editName.trim()) {
      toast.error("Collection name cannot be empty");
      return;
    }
    try {
      setSavingEdit(true);
      const res = await server.put(
        `/admin/verified-collection/${editingCollection.id}`,
        {
          name: editName,
        }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Collection updated successfully");
        setCollections((prev) =>
          prev.map((c) =>
            c.id === editingCollection.id
              ? { ...c, name: res.data.data.collection.name }
              : c
          )
        );
        setEditingCollection(null);
      } else {
        toast.error(res.data?.message || "Failed to update collection");
      }
    } catch (err: any) {
      console.error("Edit collection error:", err);
      toast.error(err.response?.data?.message || "Failed to update collection");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start justify-between sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">Verified Collections</h2>
            <p className="text-muted-foreground">
              Manage NFT collections that can host raffles
            </p>
          </div>
          {/* Refresh Button */}
          <Button
            variant="default"
            size="icon"
            onClick={fetchCollections}
            disabled={loading}
            title="Refresh collections"
            className="hover:bg-accent sm:hidden"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin text-muted-foreground" : ""
              }`}
            />
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center sm:justify-end">
          <Button
            variant="default"
            size="icon"
            onClick={fetchCollections}
            disabled={loading}
            title="Refresh collections"
            className="hidden sm:flex hover:bg-accent"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin text-muted-foreground" : ""
              }`}
            />
          </Button>
          <Button variant="outline" onClick={toggleBulkMode}>
            {bulkMode ? "Cancel Selection" : "Select Collections"}
          </Button>
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
                    placeholder={fetchingName ? "Looking up on-chain..." : "Fox Club Genesis"}
                    value={newCollectionName}
                    disabled={fetchingName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mint Address</Label>
                  <Input
                    placeholder="FoxC...xyz1"
                    value={newCollectionAddress}
                    maxLength={50}
                    onChange={handleAddressChange}
                  />
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
      </div>

      {/* Bulk delete toolbar */}
      {/* Bulk delete toolbar */}
      {bulkMode && selectedIds.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-md">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete Selected</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Confirm Bulk Delete</DialogTitle>
              </DialogHeader>
              <p className="py-2">
                Are you sure you want to delete {selectedIds.length} collection
                {selectedIds.length > 1 ? "s" : ""}? This action cannot be
                undone.
              </p>
              <div className="flex justify-between gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setBulkMode(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    handleBulkDelete();
                  }}
                >
                  Confirm Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* CSV UPLOAD SECTION */}
      <div className="glass-card border border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          </div>
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
          {collections.map((collection) => (
            <div
              key={collection.id}
              className={`glass-card p-6 rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:glow-primary flex flex-col justify-between ${
                bulkMode && selectedIds.includes(collection.id)
                  ? "border-primary"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                {bulkMode && (
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedIds.includes(collection.id)}
                    onChange={() => handleSelect(collection.id)}
                  />
                )}
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
              <p
                className="text-xs text-muted-foreground break-all mb-3 cursor-pointer hover:text-primary"
                onClick={() => {
                  navigator.clipboard.writeText(collection.address);
                  toast.success("Mint address copied!");
                }}
                title="Click to copy"
              >
                {collection.address}
              </p>

              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  onClick={() => {
                    setEditingCollection(collection);
                    setEditName(collection.name);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Switch
                  checked={collection.verified}
                  onCheckedChange={() => handleToggleVerify(collection.id)}
                  title={
                    collection.verified
                      ? "Click to unverify this collection"
                      : "Click to verify this collection"
                  }
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingCollection(collection)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>

                {deletingCollection && (
                  <Dialog
                    open={!!deletingCollection}
                    onOpenChange={() => setDeletingCollection(null)}
                  >
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                      </DialogHeader>
                      <p className="py-2">
                        Are you sure you want to delete "
                        {deletingCollection.name}"? This action cannot be
                        undone.
                      </p>
                      <div className="flex justify-between gap-2 mt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setDeletingCollection(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            handleDeleteCollection(deletingCollection.id);
                            setDeletingCollection(null); // close modal after delete
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Edit Collection Modal */}
      {editingCollection && (
        <Dialog
          open={!!editingCollection}
          onOpenChange={() => setEditingCollection(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Collection Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Label>Collection Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter collection name"
                className="mt-2"
              />
            </div>
            <div className="flex justify-between gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingCollection(null)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={handleEditCollection}
              >
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
