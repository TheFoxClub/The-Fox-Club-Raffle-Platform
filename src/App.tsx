import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./views/home/Home";
import Leaderboard from "./views/leaderboard/Leaderboard";
import Profile from "./views/profile/Profile";
import CreateRaffle from "./views/raffle/CreateRaffle";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RaffleDetail from "./views/raffle/RaffleDetail";

function App() {
  return (
    <Router>
      <Layout>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/create" element={<CreateRaffle />} />
          <Route path="/raffle/:id" element={<RaffleDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
