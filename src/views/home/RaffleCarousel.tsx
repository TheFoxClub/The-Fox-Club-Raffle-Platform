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
// import { featuredRaffles } from "../../dummydata/featuredRaffles";

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
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [index, setIndex] = useState(0);

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
            sold: Number(r.ticketSold ?? 0),
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
        }
      } catch (error) {
        console.error("Failed to load featured raffles", error);
      }
    };
    fetchFeatured();
  }, []);

  //if no raffles loaded yet
  if (raffles.length === 0) {
    return (
      <Card className="glass-card p-10 text-center border-primary/30">
        Loading featured raffles...
      </Card>
    );
  }

  const data = raffles[index];

  const next = () => setIndex((prev) => (prev + 1) % raffles.length);
  const prev = () =>
    setIndex((prev) => (prev - 1 + raffles.length) % raffles.length);

  return (
    <Card className=" overflow-hidden glow-primary border-primary/30">
      <div className="relative">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-video md:aspect-auto">
            <img
              src={data.image}
              alt={data.title}
              className="w-full h-86 object-cover"
            />
            {/* Verified Badge */}
            {data.isVerified && (
              <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                <CheckCircle size={16} /> Verified
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-8 flex flex-col justify-center space-y-6 relative">
            {/* Featured Raffle Badge */}
            <div>
              <div className="inline-flex items-center rounded-full px-2.5 py-0.5 mb-4 text-sm font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white w-fit">
                Featured Raffle
              </div>

              <h2 className="text-2xl font-bold mb-3 text-gradient">
                {data.title}
              </h2>
              <p className="text-muted-foreground text-md">
                {data.description}
              </p>
            </div>

            {/* Ticket Info */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-muted-foreground">Ticket Price</p>
                  <p className="font-bold">{data.price}</p>
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
              <Button className="gradient-primary glow-primary text-white rounded-xl text-sm flex-1">
                Enter Raffle
              </Button>

              <div className="flex gap-2">
                <button
                  onClick={prev}
                  className="p-2 bg-[#1a1a1a] rounded-xl hover:bg-[#262626] flex items-center justify-center"
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={next}
                  className="p-2 bg-[#1a1a1a] rounded-xl hover:bg-[#262626] flex items-center justify-center"
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
