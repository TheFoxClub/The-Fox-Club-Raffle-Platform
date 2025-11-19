import RaffleCarousel from "./RaffleCarousel";
import HeroSection from "./HeroSection";
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
    </div>
  );
};

export default Home;
