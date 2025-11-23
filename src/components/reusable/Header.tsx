import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { Wallet, Trophy, PlusCircle, User, LogOut } from "lucide-react";
// import logoWhite from "../../../public/vite.svg";
import logo from "../../../public/assets/foxclub_logo.png";
import MyConnectWalletButton from "../../helpers/wallet-hooks/MyConnectWalletButton";
import { useWallet } from "../../helpers/solana-helpers/solana-hooks";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import SolanaSignIn from "../../helpers/solana-helpers/SolanaSignIn";
import { handleLogout } from "../../config/api";

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const user = useSelector((state: RootState) => state.user);

  const isActive = (path: string) => location.pathname === path;

  const shortenAddress = (address: string, start = 4, end = 4) =>
    `${address.slice(0, start)}...${address.slice(-end)}`;

  const logout = async () => {
    await handleLogout();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-border/50 w-full">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logo}
            alt="The Fox Club"
            className="h-10 w-10 transition-transform group-hover:scale-110"
          />
          <div>
            <h1 className="text-xl font-bold text-gradient">The Fox Club</h1>
            <p className="text-xs text-muted-foreground">Raffle Platform</p>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="gap-2"
            >
              <Trophy className="h-4 w-4" /> Raffles
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button
              variant={isActive("/leaderboard") ? "default" : "ghost"}
              className="gap-2"
            >
              <Trophy className="h-4 w-4" /> Leaderboard
            </Button>
          </Link>
          <Link to="/profile">
            <Button
              variant={isActive("/profile") ? "default" : "ghost"}
              className="gap-2"
            >
              <User className="h-4 w-4" /> Profile
            </Button>
          </Link>
        </div>

        {/* Wallet & Create Button */}
        <div className="flex items-center gap-2 relative">
          {connected && (
            <Link to="/create">
              <Button variant="outline" className="gap-2 hidden sm:flex">
                <PlusCircle className="h-4 w-4" /> Create Raffle
              </Button>
            </Link>
          )}

          <div className="flex items-center gap-2">
            {user.isAuthenticated ? null : connected ? <SolanaSignIn /> : null}

            <MyConnectWalletButton>
              {connected ? (
                <Button
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                >
                  <Wallet className="h-4 w-4" />
                  {shortenAddress(publicKey?.toBase58() || "")}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </Button>
              )}
            </MyConnectWalletButton>
            {user.isAuthenticated && (
              <Button
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                onClick={logout}
                title="Logout"
                aria-label="Logout"
              >
                Logout
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2 mt-4 w-full">
          <Link to="/" className="flex-1">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="w-full gap-2"
              size="sm"
            >
              <Trophy className="h-4 w-4" /> Raffles
            </Button>
          </Link>
          <Link to="/leaderboard" className="flex-1">
            <Button
              variant={isActive("/leaderboard") ? "default" : "ghost"}
              className="w-full gap-2"
              size="sm"
            >
              <Trophy className="h-4 w-4" /> Leaders
            </Button>
          </Link>
          <Link to="/profile" className="flex-1">
            <Button
              variant={isActive("/profile") ? "default" : "ghost"}
              className="w-full gap-2"
              size="sm"
            >
              <User className="h-4 w-4" /> Profile
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
