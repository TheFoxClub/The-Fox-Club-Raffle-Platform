import { Card } from "../../components/ui/Card";
import { User, Upload, X, Save, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { setUser, setLoading } from "../../redux/userSlice";
import server from "../../config/server";
import { useNavigate } from "react-router-dom";
import { Textarea } from "../../components/ui/Textarea";
import { toast } from "react-toastify";

type FormData = {
  username: string;
  email: string;
  bio: string;
  twitter: string;
  discord: string;
  photoUrl: string;
};

const EditProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { user_info, pubkey, isLoading } = useSelector(
    (state: RootState) => state.user,
  );

  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    bio: "",
    twitter: "",
    discord: "",
    photoUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user info if not available
  useEffect(() => {
    const fetchUser = async () => {
      dispatch(setLoading(true));
      try {
        const res = await server.get("/user/info");
        const userData = res?.data?.data?.user;

        dispatch(
          setUser({
            ...userData,
            isAuthenticated: true,
            isLoading: false,
          }),
        );
      } catch (err) {
        console.error("Failed to fetch user info:", err);
        dispatch(setLoading(false));
        toast.error("Failed to load user data");
      }
    };

    if (!user_info) {
      fetchUser();
    }
  }, [dispatch, user_info]);

  // Populate form whenever user_info is available
  useEffect(() => {
    if (user_info) {
      setFormData({
        username: user_info.username || "",
        email: user_info.email || "",
        bio: user_info.description || "",
        twitter: user_info.twitter || "",
        discord: user_info.discord || "",
        photoUrl: user_info.photoUrl || "",
      });

      if (user_info.photoUrl) {
        setImagePreview(user_info.photoUrl);
      }
    }
  }, [user_info]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile picture size should be less than 2MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, photoUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadProfileImage = async (file: File): Promise<string> => {
    try {
      setIsUploadingImage(true);
      const form = new FormData();
      form.append("file", file);

      const response = await server.post("/upload/profile-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) return response.data.url;
      else throw new Error(response.data.message || "Image upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let photoUrl = formData.photoUrl;
      if (imageFile) {
        try {
          photoUrl = await uploadProfileImage(imageFile);
        } catch (uploadError: any) {
          toast.error(`Image upload failed: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }
      }

      const res = await server.put("/user/info", {
        username: formData.username,
        email: formData.email,
        description: formData.bio,
        photoUrl: photoUrl,
        // Add social links if backend supports
      });

      dispatch(
        setUser({
          ...res.data.data.user,
          isAuthenticated: true,
          isLoading: false,
        }),
      );

      toast.success("Profile updated successfully!");
      navigate("/profile");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => navigate("/profile");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-300">
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    // <div className="container mx-auto px-4 py-2 max-w-3xl">
    //   {/* ...the rest of your form JSX remains unchanged */}
    //   {/* Paste your full form JSX here from previous code */}
    // </div>

    <div className="container mx-auto px-4 py-2 max-w-3xl">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gradient">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your profile information and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card p-6 space-y-6">
            <h1 className="text-2xl font-bold">Profile Picture</h1>
            <div className="flex items-center gap-6">
              <div className="relative">
                {imagePreview ? (
                  <div className="relative rounded-full h-24 w-24 overflow-hidden border-2 border-primary/30">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-full h-24 w-24 gradient-primary flex items-center justify-center glow-primary">
                    <User className="h-12 w-12" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-lg bg-black/50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isSaving}
                >
                  <Upload className="h-4 w-4" />
                  {isUploadingImage ? "Uploading..." : "Upload New Photo"}
                </Button>

                {imageFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 text-sm"
                    onClick={handleRemoveImage}
                    disabled={isUploadingImage || isSaving}
                  >
                    <X className="h-3 w-3" />
                    Remove Photo
                  </Button>
                )}

                <p className="text-muted-foreground text-sm">
                  JPG, PNG or WEBP. Max 2MB.
                </p>

                {isUploadingImage && (
                  <p className="text-xs text-blue-500 animate-pulse">
                    Uploading image...
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Basic Information */}
          <Card className="bg-card p-6 space-y-6">
            <h2 className="font-bold text-2xl">Basic Information</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Wallet Address
                </label>
                <Input
                  id="wallet"
                  placeholder="7xKX...9mPq"
                  disabled
                  value={pubkey}
                  className="mt-2 w-full bg-background-50"
                />
                <span className="text-xs text-muted-foreground">
                  Your wallet address cannot be changed
                </span>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Username
                </label>
                <Input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  className="mt-2 w-full bg-background-50"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Email
                </label>
                <Input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="mt-2 w-full bg-background-50"
                  disabled={isSaving}
                />
                <span className="text-xs text-muted-foreground">
                  Used for important notifications only
                </span>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="bio"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Bio
                </label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="border border-input rounded-lg mt-2 w-full px-3 py-2 text-base bg-background-50 focus:ring-offset-2"
                  disabled={isSaving}
                />
              </div>
            </div>
          </Card>

          {/* Social Links */}
          <Card className="bg-card p-6 space-y-6">
            <h2 className="text-2xl font-bold">Social Links</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="twitter"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Twitter
                </label>
                <Input
                  id="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  placeholder="@username"
                  className="mt-2 w-full bg-background-50"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="discord"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Discord
                </label>
                <Input
                  id="discord"
                  value={formData.discord}
                  onChange={handleChange}
                  placeholder="Username#0000"
                  className="mt-2 w-full bg-background-50"
                  disabled={isSaving}
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full flex-1 rounded-lg gap-2"
              disabled={isSaving || isUploadingImage}
            >
              <X className="w-5 h-5" />
              Cancel
            </Button>

            <Button
              type="submit"
              variant="default"
              className="w-full gap-2 flex-1 rounded-lg gradient-primary glow-primary"
              disabled={isSaving || isUploadingImage}
            >
              <Save className="h-5 w-5" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
  // );
};

export default EditProfile;
