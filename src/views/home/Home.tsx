import HeroSection from "./HeroSection";
import RaffleCarousel from "./RaffleCarousel";
import RaffleFilter from "./RaffleFilter";
import { RaffleGrid } from "./RaffleGrid";
import { useState } from "react";
// import { toast } from "react-toastify";

const Home = () => {
  const [filters, setFilters] = useState<any | undefined>(undefined);
  // const notifySuccess = () => toast.success("Welcome to the raffle!");
  // const notifyError = () => toast.error("Something went wrong.");

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
