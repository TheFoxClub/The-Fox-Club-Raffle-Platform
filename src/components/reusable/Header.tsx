import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import {
  Ticket,
  Wallet,
  Trophy,
  PlusCircle,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronDown,
  Coins,
  Star,
} from "lucide-react";
// import logoWhite from "../../../public/vite.svg";
import logo from "../../../public/assets/foxclub_logo.png";
import MyConnectWalletButton from "../../helpers/wallet-hooks/MyConnectWalletButton";
import { useWallet } from "../../helpers/solana-helpers/solana-hooks";
import { useConnection } from "@solana/wallet-adapter-react";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import SolanaSignIn from "../../helpers/solana-helpers/SolanaSignIn";
import { handleLogout } from "../../config/api";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import server from "../../config/server";
import { formatXp } from "../../utils/formatXp";

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const user = useSelector((state: RootState) => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [balanceMenuOpen, setBalanceMenuOpen] = useState(false);
  const [balances, setBalances] = useState<{ symbol: string; amount: number }[]>([]);
  const [totalXp, setTotalXp] = useState<number | null>(null);
  const balanceMenuRef = useRef<HTMLDivElement>(null);

  // console.log("Header user:", user);

  const isActive = (path: string) => location.pathname === path;

  const shortenAddress = (address: string, start = 4, end = 4) =>
    `${address.slice(0, start)}...${address.slice(-end)}`;

  const logout = async () => {
    await handleLogout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!user.isAuthenticated) {
      return;
    }

    const USER_AIRDROP_STATUS = {
      UNCLAIMED: 0,
      CLAIMED: 1,
      PENDING: 2,
    };

    const getUserWinsAndPayouts = async () => {
      try {
        const [winsRes, hostedRes, airdropRes] = await Promise.all([
          server.get("/raffle/user/wins"),
          server.get("/raffle/user/hosted"),
          server.get("/airdrop/user/unclaimed"),
        ]);

        if (winsRes.data.success && hostedRes.data.success) {
          const winsData = winsRes.data.data.wins || [];
          const hostedData = hostedRes.data.data.raffles || [];
          const airdropRewards = airdropRes?.data?.success
            ? airdropRes.data.data.rewards || []
            : [];

          const unclaimedWinsCount = winsData.filter(
            (win: any) => !win.isClaimed
          ).length;

          const hostedRafflesWithUnclaimedPayouts = hostedData.filter(
            (raffle: any) =>
              raffle.payoutInfo?.canClaim &&
              raffle.payoutInfo?.unclaimedAmount > 0
          ).length;

          const unclaimedAirdropCount = airdropRewards.filter(
            (reward: any) => reward.status === USER_AIRDROP_STATUS.UNCLAIMED
          ).length;

          setNotificationsCount(
            unclaimedWinsCount +
              hostedRafflesWithUnclaimedPayouts +
              unclaimedAirdropCount
          );
        } else {
          setNotificationsCount(0);
        }
      } catch (error) {
        setNotificationsCount(0);
        console.log("Error fetching user data");
        toast.error("Error fetching user data");
      }
    };
    getUserWinsAndPayouts();
  }, [user]);

  useEffect(() => {
    if (!user.isAuthenticated || !connected || !publicKey) {
      setBalances([]);
      return;
    }

    const fetchBalances = async () => {
      try {
        const [lamports, tokenResponse] = await Promise.all([
          connection.getBalance(publicKey),
          server.get("/tokens/verified"),
        ]);
        const tokenData = tokenResponse.data?.message || {};
        const tokenAccounts = [
          ...(tokenData.splTokens || []),
          ...(tokenData.token2022Tokens || []),
        ];
        const tokenBalances = tokenAccounts.reduce(
          (result: Map<string, number>, token: any) => {
            const symbol = token.metadata?.symbol || token.metadata?.name || "Token";
            const amount = Number(token.amount?.uiAmount || 0);
            result.set(symbol, (result.get(symbol) || 0) + amount);
            return result;
          },
          new Map<string, number>(),
        );

        setBalances([
          { symbol: "SOL", amount: lamports / 1_000_000_000 },
          ...Array.from(tokenBalances, ([symbol, amount]) => ({ symbol, amount })),
        ]);
      } catch (error) {
        console.error("Failed to load wallet balances", error);
        setBalances([]);
      }
    };

    fetchBalances();
  }, [connection, connected, publicKey, user.isAuthenticated]);

  useEffect(() => {
    if (!user.isAuthenticated) {
      setTotalXp(null);
      return;
    }

    const fetchTotalXp = async () => {
      try {
        const response = await server.get("/user/xp");
        setTotalXp(Number(response.data?.data?.totalXp ?? 0));
      } catch (error) {
        console.error("Failed to load XP total", error);
        setTotalXp(null);
      }
    };

    fetchTotalXp();
  }, [user.isAuthenticated]);

  useEffect(() => {
    const closeBalanceMenu = (event: MouseEvent) => {
      if (!balanceMenuRef.current?.contains(event.target as Node)) {
        setBalanceMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeBalanceMenu);
    return () => document.removeEventListener("mousedown", closeBalanceMenu);
  }, []);

  const solBalance = balances.find((balance) => balance.symbol === "SOL");

  const formatBalance = (amount: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border/50 w-full backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-3 group whitespace-nowrap">
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
        <div className="hidden min-w-0 md:flex items-center gap-2">
          <Link to="/">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="gap-2"
            >
              <Ticket className="h-4 w-4" /> Raffles
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button
              variant={isActive("/leaderboard") ? "default" : "ghost"}
              className="gap-2 hover:bg-accent"
            >
              <Trophy className="h-4 w-4" /> Leaderboard
            </Button>
          </Link>
          {user.isAuthenticated && (
            <Link to="/profile">
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                className={`w-full gap-2 cursor-pointer justify-center relative rounded-md hover:bg-accent ${
                  notificationsCount > 0 ? "w-31 pl-0 pr-4 justify-center" : ""
                }`}
              >
                {/* <User className="h-4 w-4" /> Profile */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </div>
                {notificationsCount > 0 && (
                  <span className="absolute right-4 top-1/3 -translate-y-1/2 min-w-[18px] h-[18px] px-1 text-[10px] flex items-center justify-center bg-red-600 text-white font-bold rounded-full ">
                    {notificationsCount > 9 ? "9+" : notificationsCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          {user.isAdmin && (
            <Link to="/admin">
              <Button
                variant={
                  location.pathname.startsWith("/admin") ? "default" : "ghost"
                }
                className="gap-2 cursor-pointer"
              >
                <Shield className="h-4 w-4" /> Dashboard
              </Button>
            </Link>
          )}
        </div>
        {/* Wallet & Create Button */}
        <div className="flex shrink-0 items-center gap-2 relative">
          {user.isAuthenticated && connected && (
            <Link to="/create">
              <Button
                variant="outline"
                className="gap-2 hidden sm:flex cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" /> Create Raffle
              </Button>
            </Link>
          )}
          <div className="flex flex-col items-end gap-2">
            <div className="flex w-full flex-wrap items-center justify-center gap-2">
              {user.isAuthenticated ? null : connected ? <SolanaSignIn /> : null}
              <MyConnectWalletButton>
                {connected ? (
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer"
                  >
                    <Wallet className="h-4 w-4" />
                    {shortenAddress(publicKey?.toBase58() || "")}
                  </Button>
                ) : null}
              </MyConnectWalletButton>
              {user.isAuthenticated && (
                <Button
                  variant="default"
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer"
                  onClick={logout}
                  title="Logout"
                  aria-label="Logout"
                >
                  Logout
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {user.isAuthenticated && totalXp !== null && (
                <Link to="/profile" title="View your experience points">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                  >
                    <Star className="h-4 w-4 text-primary" />
                    <span>{formatXp(totalXp)} XP</span>
                  </Button>
                </Link>
              )}
              {user.isAuthenticated && connected && (
                <div ref={balanceMenuRef} className="relative">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium"
                    onClick={() => setBalanceMenuOpen((open) => !open)}
                    aria-expanded={balanceMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <Coins className="h-4 w-4" />
                    <span>{formatBalance(solBalance?.amount || 0)} SOL</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${balanceMenuOpen ? "rotate-180" : ""}`} />
                  </Button>
                  {balanceMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-52 overflow-hidden rounded-md border border-border bg-card shadow-lg" role="listbox" aria-label="Wallet balances">
                      {balances.map((balance) => (
                        <div
                          key={balance.symbol}
                          className="flex w-full items-center justify-between gap-4 px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{balance.symbol}</span>
                          <span className="text-muted-foreground">{formatBalance(balance.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        <div className="flex md:hidden items-center gap-2 mt-4 w-full">
          <Link to="/" className="flex-1">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="w-full gap-2 cursor-pointer"
              size="sm"
            >
              <Ticket className="h-4 w-4" /> Raffles
            </Button>
          </Link>
          <Link to="/leaderboard" className="flex-1">
            <Button
              variant={isActive("/leaderboard") ? "default" : "ghost"}
              className="w-full gap-2 cursor-pointer"
              size="sm"
            >
              <Trophy className="h-4 w-4" /> Leaderboard
            </Button>
          </Link>

          {/* Hamburger Menu */}
          {user.isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-accent ml-auto"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && user.isAuthenticated && (
          <div className="w-full md:hidden flex flex-col gap-2 mt-2 border-t border-border/50 pt-2">
            <Link to="/create" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="outline"
                className="w-full gap-2 justify-center hover:bg-accent"
                size="sm"
              >
                <PlusCircle className="h-4 w-4" /> Create Raffle
              </Button>
            </Link>
            <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                className="w-full gap-2 cursor-pointer justify-center border border-border rounded-md hover:bg-accent"
                size="sm"
              >
                {/* <User className="h-4 w-4" /> Profile */}
                <div className="relative flex items-center gap-2 justify-center w-full">
                  <User className="h-4 w-4" />
                  Profile
                  {notificationsCount > 0 && (
                    <span className="absolute -top-1 right-30 bg-red-500 text-white text-xs font-bold px-2 py-0.2 rounded-full">
                      {/* {notificationsCount} */}
                      {notificationsCount > 9 ? "9+" : notificationsCount}
                    </span>
                  )}
                </div>
              </Button>
            </Link>

            {user.isAdmin && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={
                    location.pathname.startsWith("/admin") ? "default" : "ghost"
                  }
                  className="w-full gap-2 cursor-pointer justify-center border border-border rounded-md hover:bg-accent"
                  size="sm"
                >
                  <Shield className="h-4 w-4" /> Dashboard
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
