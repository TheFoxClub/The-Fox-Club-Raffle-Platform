import { useState, useEffect } from "react";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Coins,
  Users,
} from "lucide-react";
import server from "../../config/server";
import { useNavigate } from "react-router-dom";
import socketService from "../../services/socket.service";
// import { featuredRaffles } from "../../dummydata/featuredRaffles";
import { formatPrice } from "../../helpers/formatPrice";
import { useTokenSymbol } from "../../hooks/useTokenDisplay";

interface Raffle {
  id: number;
  title: string;
  description: string;
  price: string;
  sold: number;
  total: number;
  image: string;
  tokenType: string;
  tokenAddress?: string;
  isVerified: boolean;
}

function RaffleCard({
  raffle,
  isActive,
  style,
  onClick,
}: {
  raffle: Raffle;
  isActive: boolean;
  style: React.CSSProperties;
  onClick: () => void;
}) {
  const { symbol: enhancedTokenSymbol, loading } = useTokenSymbol(
    raffle.tokenType,
    raffle.tokenAddress,
  );

  return (
    <Card
      key={raffle.id}
      className={`absolute w-[90vw] sm:w-[420px] md:w-[440px]
      lg:w-[480px] glass-card overflow-hidden border-primary/30 transition-all duration-500 ease-out cursor-pointer ${
        isActive ? "glow-primary" : ""
      }`}
      style={{
        ...style,
        transformStyle: "preserve-3d",
      }}
      onClick={onClick}
    >
      <div className="relative aspect-[16/8] overflow-hidden">
        <img
          src={raffle.image}
          alt={raffle.title}
          className="w-full h-full object-cover"
        />
        {/* Verified Badge */}
        {raffle.isVerified && (
          <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
            <CheckCircle size={16} /> Verified
          </div>
        )}
        <div className="absolute top-4 left-4 rounded-full px-2.5 py-0.5 mb-2 text-sm font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white w-fit">
          Featured
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col justify-between space-y-2 relative">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gradient">{raffle.title}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {raffle.description}
          </p>
        </div>

        <div className="flex gap-10 text-sm justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            <div>
              <span className="text-muted-foreground text-sm mt-1">
                Ticket Price
              </span>
              <p className="font-semibold">
                {formatPrice(raffle.price)}{" "}
                {loading ? "..." : enhancedTokenSymbol || raffle.tokenType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="text-gray-400">Tickets Sold</p>
              <span className="font-bold">
                {raffle.sold} / {raffle.total}
              </span>
            </div>
          </div>
        </div>

        {isActive && (
          <Button
            className="w-full sm:flex-1 gradient-primary glow-primary bg-background text-white rounded-xl"
            onClick={onClick}
          >
            Enter Raffle
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function RaffleCarousel() {
  const navigate = useNavigate();

  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "moving" | "reset">("idle");
  const [returningIndex, setReturningIndex] = useState<number | null>(null);

  const MIN_SWIPE_DISTANCE = 50;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await server.get("/raffle/featured");
        if (res.data?.success) {
          const raw = res.data.data.raffles;
          const mapped = raw.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            price: r.ticketPrice,
            sold: Number(r.ticketsSold ?? 0),
            total: Number(r.totalTickets),
            image: r.imageUrl,
            tokenType: r.tokenType === "SOLANA" ? "SOL" : r.tokenType,
            tokenAddress: r.tokenAddress,
            isVerified: r.raffle_detail?.requiresNftVerification ?? false,
          }));
          setRaffles(mapped);
        } else {
          setRaffles([]);
        }
      } catch (error) {
        console.error("Failed to load featured raffles", error);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const handleRaffleListUpdate = (data: any) => {
      if (data.raffleId) {
        if (data.action === "raffle_created") {
          server
            .get("/raffle/featured")
            .then((res) => {
              if (res.data?.success) {
                const raw = res.data.data.raffles;
                const mapped = raw.map((r: any) => ({
                  id: r.id,
                  title: r.title,
                  description: r.description,
                  price: r.ticketPrice,
                  sold: Number(r.ticketsSold ?? 0),
                  total: Number(r.totalTickets),
                  image: r.imageUrl,
                  tokenType: r.tokenType === "SOLANA" ? "SOL" : r.tokenType,
                  tokenAddress: r.tokenAddress,
                  isVerified: r.raffle_detail?.requiresNftVerification ?? false,
                }));
                setRaffles(mapped);
              }
            })
            .catch((error) => {
              console.error("Failed to refresh featured raffles", error);
            });
        } else {
          setRaffles((prevRaffles) => {
            if (!prevRaffles) return prevRaffles;
            return prevRaffles.map((raffle) => {
              if (raffle.id === data.raffleId) {
                return {
                  ...raffle,
                  sold:
                    data.ticketsSold !== undefined
                      ? data.ticketsSold
                      : raffle.sold,
                  total:
                    data.totalTickets !== undefined
                      ? data.totalTickets
                      : raffle.total,
                };
              }
              return raffle;
            });
          });
        }
      }
    };

    const handleTicketPurchase = (data: any) => {
      if (data.raffleId) {
        setRaffles((prevRaffles) => {
          if (!prevRaffles) return prevRaffles;
          return prevRaffles.map((raffle) => {
            if (raffle.id === data.raffleId) {
              return {
                ...raffle,
                sold:
                  data.ticketsSold !== undefined
                    ? data.ticketsSold
                    : raffle.sold,
                total:
                  data.totalTickets !== undefined
                    ? data.totalTickets
                    : raffle.total,
              };
            }
            return raffle;
          });
        });
      }
    };

    socketService.onRaffleListUpdated(handleRaffleListUpdate);
    socketService.onTicketPurchase(handleTicketPurchase);
    return () => {
      socketService.offRaffleListUpdated(handleRaffleListUpdate);
      socketService.offTicketPurchase(handleTicketPurchase);
    };
  }, []);

  const changeSlide = (newIndex: number) => {
    if (newIndex === index) return;

    if (raffles.length === 2) {
      if (phase !== "idle") return;

      const oldIndex = index;
      setPhase("moving");
      setIndex(newIndex);

      setTimeout(() => {
        setReturningIndex(oldIndex);
        setDisplayIndex(newIndex);
        setPhase("reset");

        setTimeout(() => {
          setPhase("idle");
          setReturningIndex(null);
        }, 200);
      }, 500);
    } else {
      setIndex(newIndex);
      setDisplayIndex(newIndex);
    }
  };

  useEffect(() => {
    if (raffles.length < 2 || isHovered) return;
    const interval = setInterval(() => {
      changeSlide((index + 1) % raffles.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [raffles.length, isHovered, index, phase]);

  if (raffles === null) return null;
  if (raffles.length === 0) return null;

  const next = () => changeSlide((index + 1) % raffles.length);
  const prev = () => changeSlide((index - 1 + raffles.length) % raffles.length);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setIsHovered(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) {
      setIsHovered(false);
      return;
    }
    const distance = touchStartX - touchEndX;
    if (Math.abs(distance) < MIN_SWIPE_DISTANCE) {
      setIsHovered(false);
      return;
    }
    if (distance > 0) {
      next();
    } else {
      prev();
    }
    setIsHovered(false);
  };

  const getCardStyle = (cardIndex: number) => {
    const diff = cardIndex - index;

    if (isMobile) {
      return {
        transform: `translateX(${diff * 100}%)`,
        opacity: cardIndex === index ? 1 : 0,
        zIndex: cardIndex === index ? 10 : 1,
        transition: "transform 0.5s ease, opacity 0.5s ease",
      };
    }

    const normalized = (diff + raffles.length) % raffles.length;
    const adjusted =
      normalized > raffles.length / 2
        ? normalized - raffles.length
        : normalized;

    if (raffles.length === 2) {
      const isReturning = cardIndex === returningIndex;
      const isCenter = cardIndex === displayIndex;

      if (isReturning) {
        if (phase === "reset") {
          return {
            transform: `translateX(380px) scale(0.85) rotateY(35deg)`,
            opacity: 0,
            zIndex: -1,
            transition: "none",
            pointerEvents: "none" as React.CSSProperties["pointerEvents"],
          };
        }

        return {
          transform: `translateX(380px) scale(0.85) rotateY(35deg)`,
          opacity: 0.5,
          zIndex: 5,
          transition: "opacity 0.4s ease",
        };
      }

      if (isCenter) {
        if (phase === "idle" || phase === "reset") {
          return {
            transform: `translateX(0px) scale(1) rotateY(0deg)`,
            opacity: 1,
            zIndex: 10,
            transition: "all 0.5s ease",
          };
        }
        if (phase === "moving") {
          return {
            transform: `translateX(-380px) scale(0.85) rotateY(-35deg)`,
            opacity: 0,
            zIndex: 9,
            transition: "all 0.5s ease",
          };
        }
      }

      //  INCOMING CARD (right side preview, about to become center)
      if (phase === "idle") {
        // Resting at right as preview
        return {
          transform: `translateX(380px) scale(0.85) rotateY(35deg)`,
          opacity: 0.5,
          zIndex: 5,
          transition: "all 0.5s ease",
        };
      }
      if (phase === "moving") {
        // Slide from right → center
        return {
          transform: `translateX(0px) scale(1) rotateY(0deg)`,
          opacity: 1,
          zIndex: 9,
          transition: "all 0.5s ease",
        };
      }
      // reset — stay at center, become new current
      return {
        transform: `translateX(0px) scale(1) rotateY(0deg)`,
        opacity: 1,
        zIndex: 10,
        transition: "none",
      };
    }

    // 3+ CARDS: normal 3D carousel
    const rotateY = adjusted * 45;
    // let cardSpacing =
    //   raffles.length === 3 ? 380 : raffles.length === 4 ? 380 : 400;
    // const translateX = adjusted * cardSpacing;
    const translateX = adjusted * 370;
    const translateZ = Math.abs(adjusted) * -150;
    const scale = adjusted === 0 ? 1 : 0.78;
    const opacity = Math.abs(adjusted) > 2 ? 0 : 1 - Math.abs(adjusted) * 0.3;
    const zIndex = 10 - Math.abs(adjusted);

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
    };
  };

  return (
    <div className="relative py-4">
      <div
        className="overflow-hidden glow-primary border-primary/30 max-w-4xl mx-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isMobile && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border-primary/30 hover:bg-primary/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border-primary/30 hover:bg-primary/20"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
        <div
          className="relative h-[380px] sm:h-[430px] mx-auto overflow-hidden"
          style={{ perspective: isMobile ? "none" : "1200px" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: "preserve-3d" }}
          >
            {raffles.map((raffle, cardIndex) => {
              const style = getCardStyle(cardIndex);
              const isActive = cardIndex === index;
              return (
                <RaffleCard
                  key={raffle.id}
                  raffle={raffle}
                  isActive={isActive}
                  style={style}
                  onClick={() => navigate(`/raffle/raffle-${raffle.id}`)}
                />
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 justify-center mt-4">
          {raffles.map((_, i) => (
            <div
              key={i}
              onClick={() => changeSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                index === i ? "w-8 bg-primary" : "w-2 bg-gray-600"
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
