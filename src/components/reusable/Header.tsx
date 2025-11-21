import { Link, useLocation } from "react-router-dom";
import Button from "../ui/Button";
import { Wallet, Trophy, PlusCircle, User } from "lucide-react";
// import logoWhite from "../../../public/vite.svg";
import logo from "../../../public/assets/foxclub_logo.png"; // adjust the path if needed
import { useState } from "react";

export const Header = () => {
  const location = useLocation();
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const isActive = (path: string) => location.pathname === path;

  const handleWalletConnect = () => {
    // Mock wallet connection - will be replaced with actual Solana wallet integration
    if (!isWalletConnected) {
      setIsWalletConnected(true);
      setWalletAddress("7xKXtg...2ySm");
    } else {
      setIsWalletConnected(false);
      setWalletAddress("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-border/50 w-full">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
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

          <div className="hidden md:flex items-center gap-2">
            <Link to="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                Raffles
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button
                variant={isActive("/leaderboard") ? "default" : "ghost"}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Button>
            </Link>
            <Link to="/profile">
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isWalletConnected && (
              <Link to="/create">
                <Button variant="outline" className="gap-2 hidden sm:flex">
                  <PlusCircle className="h-4 w-4" />
                  Create Raffle
                </Button>
              </Link>
            )}
            <Button
              onClick={handleWalletConnect}
              className="gap-2 gradient-primary glow-primary"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isWalletConnected ? walletAddress : "Connect Wallet"}
              </span>
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="flex md:hidden items-center gap-2 mt-4">
          <Link to="/" className="flex-1">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="w-full gap-2"
              size="sm"
            >
              <Trophy className="h-4 w-4" />
              Raffles
            </Button>
          </Link>
          <Link to="/leaderboard" className="flex-1">
            <Button
              variant={isActive("/leaderboard") ? "default" : "ghost"}
              className="w-full gap-2"
              size="sm"
            >
              <Trophy className="h-4 w-4" />
              Leaders
            </Button>
          </Link>
          <Link to="/profile" className="flex-1">
            <Button
              variant={isActive("/profile") ? "default" : "ghost"}
              className="w-full gap-2"
              size="sm"
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
