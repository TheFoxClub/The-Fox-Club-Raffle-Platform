import { Card } from "../../components/ui/Card";
import { Progress } from "../../components/ui/Progress";
import { CheckCircle, Clock, Users, Coins } from "lucide-react";

export interface RaffleCardProps {
  id: number;
  image: string;
  title: string;
  price: string;
  sold: number;
  total: number;
  endTime: string;
  tokenType: string;
  isVerified: boolean;
  isFeatured: boolean;
}

export const RaffleCard = ({
  id,
  title,
  image,
  price,
  sold,
  total,
  endTime,
  tokenType,
  isVerified = false,
  isFeatured = false,
}: RaffleCardProps) => {
  const ticketsLeft = total - sold;
  const progress = (sold / total) * 100;

  return (
    <Card className="glass-card group hover:border-primary/50 transition-all duration-300 hover:glow-primary overflow-hidden border-primary/30">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        {isFeatured && (
          <div className="absolute top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white w-fit">
            Featured
          </div>
        )}
        {isVerified && (
          <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
            <CheckCircle size={16} /> Verified
          </div>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-lg font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1 ">
              <Coins className="h-4 w-4" />
              <span>
                {price} {tokenType}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{endTime}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm items-center">
            <div className="flex items-center text-muted-foreground gap-1">
              <Users className="h-4 w-4" />
              <span>
                {sold} / {total} tickets
              </span>
            </div>
            <span className="font-semibold text-accent">
              {ticketsLeft} left
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
      </div>
    </Card>
  );
};
