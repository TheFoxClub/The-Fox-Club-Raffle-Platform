import { useEffect } from "react";
import { useAppDispatch } from "./redux/store";
import { hydrateUserState } from "./redux/userSlice";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./views/home/Home";
import Leaderboard from "./views/leaderboard/Leaderboard";
import Profile from "./views/profile/Profile";
import CreateRaffle from "./views/raffle/CreateRaffle";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MyWalletWrapper from "./helpers/wallet-hooks/MyWalletWrapper";
import { useSelector } from "react-redux";
import type { RootState } from "./redux/store";
import Loading from "./components/reusable/Loading";
// import { UmiProvider } from "./helpers/umi/UmiProvider";
import "./index.css";
import RaffleDetail from "./views/raffle/RaffleDetail";
import EditProfile from "./views/profile/EditProfile";

function App() {
  // let endpoint = "https://api.devnet.solana.com";

  // if (import.meta.env.REACT_APP_SOLANA_RPC_POOL_DAS_API) {
  //   endpoint = import.meta.env.REACT_APP_SOLANA_RPC_POOL_DAS_API;
  // }

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateUserState());
  }, []);

  const isLoading = useSelector((state: RootState) => state.isLoading);

  return (
    <Router>
      <MyWalletWrapper autoConnect>
        {isLoading && <Loading />}
        {/* <UmiProvider endpoint={endpoint}> */}
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
            <Route path="/profile/EditProfile" element={<EditProfile />} />
            <Route path="/create" element={<CreateRaffle />} />
            <Route path="/raffle/:id" element={<RaffleDetail />} />
          </Routes>
        </Layout>
        {/* </UmiProvider> */}
      </MyWalletWrapper>
    </Router>
  );
}

export default App;
