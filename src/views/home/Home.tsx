import HeroSection from "./HeroSection";
import RaffleCarousel from "./RaffleCarousel";
import { RaffleGrid } from "./RaffleGrid";
import { toast } from "react-toastify";

const Home = () => {
  const notifySuccess = () => toast.success("Welcome to the raffle!");
  const notifyError = () => toast.error("Something went wrong.");

  return (
    <div>
      <HeroSection />
      <div>
        <button onClick={notifySuccess}>Show success toast</button>
        <button onClick={notifyError} style={{ marginLeft: 8 }}>
          Show error toast
        </button>
      </div>

      <RaffleCarousel />

      <div className="container mx-auto py-10">
        <RaffleGrid />
      </div>
    </div>
  );
};

export default Home;
