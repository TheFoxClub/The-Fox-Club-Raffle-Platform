import { useState, type ReactNode } from "react";
import { Link, useLocation, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Shield,
  Coins,
  Star,
  Settings,
  //  Gift,
  TrendingUp,
  Trophy,
  LogOut,
  Menu,
  // Bell,
  ChevronLeft,
  Home,
  X,
  Settings,
} from "lucide-react";
import Button from "../ui/Button";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import { handleLogout } from "../../config/api";
import { toast } from "react-toastify";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Ticket, label: "Raffles", path: "/admin/raffles" },
  { icon: Shield, label: "Collections", path: "/admin/collections" },
  { icon: Coins, label: "Tokens", path: "/admin/tokens" },
  { icon: Star, label: "XP Management", path: "/admin/xp" },
  { icon: Settings, label: "Fees & Config", path: "/admin/fees" },
  //{ icon: Gift, label: "Rewards", path: "/admin/rewards" },
  { icon: Trophy, label: "Leaderboards", path: "/admin/leaderboards" },
  { icon: TrendingUp, label: "Analytics", path: "/admin/analytics" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const shortenAddress = (address: string, start = 4, end = 4) =>
    `${address.slice(0, start)}...${address.slice(-end)}`;

  const logout = async () => {
    await handleLogout();
    navigate("/");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied");
    } catch {
      toast.error("Failed to copy wallet address");
    }
  };

  return (
    <div className="min-h-screen h-screen bg-background flex overflow-hidden">
      {/* Backdrop Overlay - Mobile Only */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile and Desktop */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-black border-r border-border/50 transition-all duration-300 flex flex-col fixed h-screen z-50 overflow-hidden md:relative md:z-0 md:w-64 md:h-screen`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
          {sidebarOpen && (
            <Link to="/admin" className="flex items-center gap-2">
              <img
                src="/assets/foxclub_logo.png"
                alt="Logo"
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm font-bold text-gradient">ADMIN</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive(item.path)
                  ? "bg-gradient-primary text-white glow-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Back to Site & Logout */}
        <div className="p-4 border-t border-border/50 space-y-2 shrink-0">
          <Link to="/">
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all w-full">
              <Home className="h-5 w-5" />
              <span className="text-sm font-medium">Back to Site</span>
            </button>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      {/* <div
        className={`flex-1 ${
          sidebarOpen ? "md:ml-0" : "md:ml-0"
        } ml-0 transition-all duration-300`}
      > */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="bg-black border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Mobile Hamburger Menu */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden shrink-0"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
              <h1 className="text-lg sm:text-xl font-bold truncate">
                {menuItems.find((item) => isActive(item.path))?.label ||
                  "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
              </Button> */}

              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {user.isAdmin ? "Admin" : "User"}
                  </p>

                  <button
                    onClick={() => user.pubkey && copyToClipboard(user.pubkey)}
                    className="text-xs text-muted-foreground hover:text-primary transition"
                  >
                    {user.pubkey
                      ? shortenAddress(user.pubkey)
                      : "Not connected"}
                  </button>
                </div>
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">
                  {user.isAdmin ? "A" : "U"}
                </div>
              </div>

              <div className="sm:hidden flex items-center justify-center">
                <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-xs">
                  {user.isAdmin ? "A" : "U"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
