import FeaturedSection from "./FeaturedSection";
import { toast } from "react-toastify";

const Home = () => {
  const notifySuccess = () => toast.success("Welcome to the raffle!");
  const notifyError = () => toast.error("Something went wrong.");
  
  return (
    <div>
      <FeaturedSection />
      <div style={{ marginTop: 12 }}>
        <button onClick={notifySuccess}>Show success toast</button>
        <button onClick={notifyError} style={{ marginLeft: 8 }}>
          Show error toast
        </button>
      </div>
    </div>
  );
};

export default Home;
