import HeroSection from "./HeroSection";
import RaffleCarousel from "./RaffleCarousel";
import RaffleFilter from "./RaffleFilter";
import { RaffleGrid } from "./RaffleGrid";
import { useState } from "react";

const Home = () => {
  const [filters, setFilters] = useState<any | undefined>(undefined);

  return (
    <div className="px-4">
      <HeroSection />
      <RaffleCarousel />
      <RaffleFilter onApplyFilters={(p) => setFilters(p)} />
      <RaffleGrid filters={filters} />
    </div>
  );
};

export default Home;
