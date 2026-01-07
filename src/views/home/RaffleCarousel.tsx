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

interface Raffle {
  id: number;
  title: string;
  description: string;
  price: string;
  sold: number;
  total: number;
  image: string;
  tokenType: string;
  isVerified: boolean;
}

export default function RaffleCarousel() {
  const navigate = useNavigate();

  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await server.get("/raffle/featured");
        console.log("API response:", res.data);

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
            tokenType:
              r.tokenType === 0
                ? "SOL"
                : r.tokenType === 1
                ? "USDT"
                : r.tokenType === 2
                ? "BONK"
                : "USDC",
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

  // Socket.IO integration for real-time updates (separate useEffect to avoid dependency issues)
  useEffect(() => {
    const handleRaffleListUpdate = (data: any) => {
      console.log("Featured raffles - raffle list update received:", data);

      // Update the specific raffle in the list if it exists
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

    const handleTicketPurchase = (data: any) => {
      console.log("Featured raffles - ticket purchase received:", data);

      // Update the specific raffle's ticket count
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

    // Register Socket.IO event listeners
    socketService.onRaffleListUpdated(handleRaffleListUpdate);
    socketService.onTicketPurchase(handleTicketPurchase);

    // Cleanup event listeners
    return () => {
      socketService.offRaffleListUpdated(handleRaffleListUpdate);
      socketService.offTicketPurchase(handleTicketPurchase);
    };
  }, []); // Empty dependency array to avoid re-registering listeners

  useEffect(() => {
    if (raffles.length < 2 || isHovered) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % raffles.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [raffles.length, isHovered]);

  if (raffles === null) return null;

  //if no raffles loaded yet
  if (raffles.length === 0) return null;

  const data = raffles[index];

  const next = () => setIndex((prev) => (prev + 1) % raffles.length);
  const prev = () =>
    setIndex((prev) => (prev - 1 + raffles.length) % raffles.length);

  return (
    <Card
      className="overflow-hidden glow-primary border-primary/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-video md:aspect-auto">
            <img
              src={data.image}
              alt={data.title}
              className="w-full h-90 object-cover"
            />
            {/* Verified Badge */}
            {data.isVerified && (
              <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                <CheckCircle size={16} /> Verified
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-4 md:p-8 flex flex-col justify-between space-y-6 relative">
            {/* Featured Raffle Badge */}
            <div>
              <div className="inline-flex items-center rounded-full px-2.5 py-0.5 mb-4 text-sm font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white w-fit">
                Featured Raffle
              </div>

              <h2 className="text-xl md:text-2xl font-bold mb-3 text-gradient">
                {data.title}
              </h2>
              <p className="text-muted-foreground text-base">
                {data.description}
              </p>
            </div>

            {/* Ticket Info */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-muted-foreground">Ticket Price</p>
                  <p className="font-bold">
                    {formatPrice(data.price)} {data.tokenType}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-gray-400">Tickets Sold</p>
                  <p className="font-bold">
                    {data.sold} / {data.total}
                  </p>
                </div>
              </div>
            </div>

            {/* Button + Arrows */}
            <div className="flex items-center gap-3">
              <Button
                className="w-full sm:flex-1 gradient-primary glow-primary bg-background text-white rounded-xl"
                onClick={() => navigate(`/raffle/raffle-${data.id}`)}
              >
                Enter Raffle
              </Button>

              <div className="flex gap-2">
                <button
                  onClick={prev}
                  className="p-2 bg-background border-input rounded-xl hover:bg-[#262626]"
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={next}
                  className="p-2 bg-background border-input rounded-xl hover:bg-[#262626]"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex gap-2 justify-center">
              {raffles.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    index === i ? "w-8 bg-primary" : "w-2 bg-gray-600"
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
