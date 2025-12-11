import { useState, useRef, useEffect } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
  User,
  Trophy,
  Flame,
  Award,
  Ticket,
  Calendar,
  Coins,
} from "lucide-react";
import server from "../../config/server";
import { Link } from "react-router-dom";

const HostProfilePopover = ({ hostId }: { hostId: number }) => {
  const [showPopover, setShowPopover] = useState(false);
  const [hostData, setHostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const fetchHostInfo = async () => {
    if (showPopover) {
      setShowPopover(false);
      return;
    }
    setLoading(true);
    try {
      const res = await server.get(`/user/info/${hostId}`);
      if (res.data.success) {
        const user = res.data.data.user;
        // For missing level/rank/streak, we set default 1
        const extended = {
          ...user,
          level: 1,
          rank: 1,
          streak: 1,
          xp: 0,
          xpGoal: 15000,
          photoUrl: user.user_info?.photoUrl || "",
        };
        // Fetch hosted raffles if available
        extended.hostedRaffles = user.raffles || [];
        setHostData(extended);
        setShowPopover(true);
      }
    } catch (err) {
      console.error("Failed to fetch host info:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <Button variant="outline" onClick={fetchHostInfo} ref={buttonRef}>
        View Profile
      </Button>

      {showPopover && hostData && (
        <div
          ref={popoverRef}
          className="absolute bottom-full right-0 mb-2 w-84 bg-black/80 backdrop-blur-xl p-6
           border border-border rounded-xl shadow-lg z-50 transition-opacity duration-200 ease-out"
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-4">
              {/* User Photo and Wallet */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center gradient-primary glow-primary">
                  {hostData.photoUrl ? (
                    <img
                      src={hostData.photoUrl}
                      alt="Host"
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="break-all text-sm font-base">
                  {hostData.pubkey}
                </div>
              </div>

              {/* Level, Rank, Streak */}
              <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-accent" /> Level{" "}
                  {hostData.level}
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-primary" /> Rank #
                  {hostData.rank}
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />{" "}
                  {hostData.streak}-Day Streak
                </div>
              </div>

              {/* XP Bar */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>XP Progress</span>
                  <span>
                    {hostData.xp} / {hostData.xpGoal} XP
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-primary"
                    style={{
                      width: `${(hostData.xp / hostData.xpGoal) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Hosted Raffles */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Hosted Raffles</h4>
                <div className="max-h-34 overflow-y-auto pr-2 custom-scrollbar">
                  {hostData.hostedRaffles.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No raffles hosted yet.
                    </p>
                  ) : (
                    hostData.hostedRaffles.map((r: any) => (
                      <Link to={`/raffle/${r.id}`} key={r.id}>
                        <Card className="p-2 bg-card/50 backdrop-blur-xl mb-1.5 border border-border/50 text-xs cursor-pointer hover:bg-card/50">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3>{r.title}</h3>
                                {r.status === "LIVE" && (
                                  <div className="top-3 left-3 inline-flex items-center rounded-full px-1.5 py-0.5 text-[12px] font-semibold bg-primary text-white w-fit">
                                    Active
                                  </div>
                                )}
                                {r.status === "ENDED" && (
                                  <div className="top-3 left-3 inline-flex items-center rounded-full px-1.5 py-0.5 text-[12px] font-semibold bg-secondary text-white w-fit">
                                    Completed
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center text-muted-foreground gap-2">
                                <div className="flex items-center gap-1">
                                  <Ticket className="h-4 w-4" />
                                  <span>
                                    {r.ticketsSold} / {r.totalTickets} sold
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Coins className="h-4 w-4 text-accent" />
                                  <span>{r.revenue ?? 0} SOL revenue</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{r.endDate.split("T")[0]}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HostProfilePopover;
