import HeroSection from "./HeroSection";
import RaffleCarousel from "./RaffleCarousel";
import RaffleFilter from "./RaffleFilter";
import { RaffleGrid } from "./RaffleGrid";
import { useState } from "react";
import type { RaffleSortOption } from "./RaffleFilter";

const Home = () => {
  const [sortBy, setSortBy] = useState<RaffleSortOption>("");

  return (
    <div className="px-4">
      <HeroSection />
      <RaffleCarousel />
      <RaffleFilter sortBy={sortBy} onSortChange={setSortBy} />
      <RaffleGrid sortBy={sortBy} />
    </div>
  );
};

export default Home;
