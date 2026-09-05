import { Card } from "../../components/ui/Card";
import { Progress } from "../../components/ui/Progress";
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Ticket, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { getAssetUrl } from "../../helpers/assetUrl";
import { formatPrice } from "../../helpers/formatPrice";
import { useTokenSymbol } from "../../hooks/useTokenDisplay";

export interface RaffleCardProps {
  id: number;
  image: string;
  title: string;
  price: string;
  sold: number;
  total: number;
  endTime: string;
  tokenType: string;
  tokenAddress?: string;
  isVerified: boolean;
  isFeatured: boolean;
  floorPrice?: { amount: number; collectionName?: string | null } | null;
  paymentOptions?: { id: number; tokenSymbol: string; ticketPrice: string }[];
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
  tokenAddress,
  isVerified = false,
  isFeatured = false,
  floorPrice,
  paymentOptions = [],
}: RaffleCardProps) => {
  const [priceIndex, setPriceIndex] = useState(0);
  const ticketsLeft = Math.max(total - sold, 0);
  const progress = Math.min((sold / total) * 100, 100);
  const activePaymentOption = paymentOptions[priceIndex];
  const { symbol: enhancedTokenSymbol, loading: tokenLoading } = useTokenSymbol(
    tokenType,
    tokenAddress,
  );
  const changePrice = (event: React.MouseEvent, direction: number) => {
    event.preventDefault();
    event.stopPropagation();
    setPriceIndex((currentIndex) =>
      (currentIndex + direction + paymentOptions.length) % paymentOptions.length,
    );
  };

  return (
    <Link to={`/raffle/raffle-${id}`}>
      <Card className="glass-card group hover:border-primary-50 transition-all duration-300 hover:glow-primary overflow-hidden border-primary/30">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={getAssetUrl(image)}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/uploads/nft-placeholder.svg";
              }
            }
            loading="lazy"
          />
          {isFeatured && (
            <div className="absolute top-12 left-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white w-fit">
              Featured
            </div>
          )}
          {isVerified && (
            <div className="absolute top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 py-1 rounded-full flex items-center gap-2 text-sm">
              <CheckCircle size={16} /> Verified
            </div>
          )}
          {floorPrice && (
            <div className="absolute top-3 left-3 rounded-md bg-orange-500/80 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
              FP: {formatPrice(floorPrice.amount)} SOL
            </div>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-lg font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
              {title}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex min-w-0 items-center gap-1">
                {paymentOptions.length > 1 && (
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-accent hover:text-foreground"
                    onClick={(event) => changePrice(event, -1)}
                    aria-label="Show previous ticket currency"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <Coins className="h-4 w-4" />
                <span>
                  {formatPrice(activePaymentOption?.ticketPrice ?? price)}{" "}
                  {activePaymentOption?.tokenSymbol || (tokenLoading ? "..." : enhancedTokenSymbol)}
                </span>
                {paymentOptions.length > 1 && (
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-accent hover:text-foreground"
                    onClick={(event) => changePrice(event, 1)}
                    aria-label="Show next ticket currency"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
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
                <Ticket className="h-4 w-4" />
                <span>
                  {sold} / {total} tickets
                </span>
              </div>
              <span
                className={`font-semibold ${
                  ticketsLeft === 0 ? "text-destructive" : "text-accent"
                }`}
              >
                {ticketsLeft === 0 ? "Sold Out" : `${ticketsLeft} left`}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </div>
      </Card>
    </Link>
  );
};
