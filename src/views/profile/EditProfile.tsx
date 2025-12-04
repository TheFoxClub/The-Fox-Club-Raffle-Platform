import { Card } from "../../components/ui/Card";
import { User, Upload, X, Save } from "lucide-react";
import Button from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../redux/store";
import { setUser } from "../../redux/userSlice";
import server from "../../config/server";
//import { initialData } from "../../dummydata/editProfileData";
//import type { FormDetails } from "../../dummydata/editProfileData";
import { useNavigate } from "react-router-dom";
import { Textarea } from "../../components/ui/Textarea";
//import { uploadImage } from "../../api";

type FormData = {
  username: string;
  email: string;
  bio: string;
  twitter: string;
  discord: string;
  // photoUrl?: string;
};

const EditProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { user_info, pubkey } = useSelector((state: RootState) => state.user);

  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    bio: "",
    twitter: "",
    discord: "",
    //  photoUrl: "",
  });

  // const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user_info) {
      setFormData({
        username: user_info.username || "",
        email: user_info.email || "",
        bio: user_info.description || "",
        twitter: "",
        discord: "",
        //  photoUrl: user_info.photoUrl || "",
      });
    }
  }, [user_info]);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setImageFile(e.target.files[0]);
  //     setFormData((prev) => ({ ...prev, photoUrl: URL.createObjectURL(e.target.files![0])}));
  //   }
  // };

  const handleCancel = () => {
    navigate("/profile");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await server.put("/user/info", {
        username: formData.username,
        email: formData.email,
        description: formData.bio,
        // photoUrl: uploadedImageUrl,
      });

      dispatch(
        setUser({
          ...res.data.data,
          isAuthenticated: true,
          isLoading: false,
        })
      );

      navigate("/profile");
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
              <div className="rounded-full h-24 w-24 gradient-primary flex items-center justify-center glow-primary">
                <User className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="gap-2 rounded-lg bg-black/50"
                >
                  <Upload className="h-4 w-4" />
                  Upload New Photo
                </Button>
                <p className="text-muted-foreground text-sm">
                  JPG, PNG or WEBP. Max 2MB.
                </p>
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
                  Username
                </label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="border border-input rounded-lg mt-2 w-full  px-3 py-2 text-base ring-offset-background px-3 py-2 text-base ring-offset-background placeholder:text-foreground md:text-sm md:text-sm bg-background-50 focus:ring-offset-2"
                />
              </div>
            </div>
          </Card>

          {/* social links */}
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
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-cols sm:flex-row gap-4 items-center">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full flex-1 rounded-lg gap-4pro"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
              Cancel
            </Button>

            <Button
              type="submit"
              variant="default"
              className="w-full gap-4 flex-1 rounded-lg gradient-primary glow-primary"
              disabled={isSaving}
            >
              <Save className="h-5 w-5" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
