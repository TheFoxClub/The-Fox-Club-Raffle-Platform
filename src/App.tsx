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
import WalletWrapper from "./components/WalletWrapper";
import { useSelector } from "react-redux";
import type { RootState } from "./redux/store";
import Loading from "./components/reusable/Loading";
// import { UmiProvider } from "./helpers/umi/UmiProvider";
import "./index.css";
import RaffleDetail from "./views/raffle/RaffleDetail";
import EditProfile from "./views/profile/EditProfile";
import { useSocket } from "./hooks/useSocket";

// Admin imports
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDashboard from "./views/admin/AdminDashboard";
import AdminRaffles from "./views/admin/AdminRaffles";
import AdminCollections from "./views/admin/AdminCollections";
import AdminTokens from "./views/admin/AdminTokens";
// import AdminFees from "./views/admin/AdminFees";
//import AdminRewards from "./views/admin/AdminRewards";
import AdminLeaderboards from "./views/admin/AdminLeaderboards";
import AdminAnalytics from "./views/admin/AdminAnalytics";
import { ProtectedAdminRoute } from "./components/auth/ProtectedAdminRoute";
import Forbidden from "./views/errors/Forbidden";
import { authenticateUser } from "./redux/actions/userAction";

function App() {
  // let endpoint = "https://api.devnet.solana.com";

  // if (import.meta.env.VITE_SOLANA_RPC_POOL_DAS_API) {
  //   endpoint = import.meta.env.VITE_SOLANA_RPC_POOL_DAS_API;
  // }

  const dispatch = useAppDispatch();

  // Initialize Socket.IO connection
  useSocket();

  useEffect(() => {
    dispatch(hydrateUserState());
  }, []);

  useEffect(() => {
    dispatch(authenticateUser());
  }, [dispatch]);

  const isLoading = useSelector((state: RootState) => state.user.isLoading);

  return (
    <Router>
      <MyWalletWrapper autoConnect>
        <WalletWrapper>
          {isLoading && <Loading />}
          {/* <UmiProvider endpoint={endpoint}> */}
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
            {/* Public routes with main Layout */}
            <Route
              path="/"
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <Layout>
                  <Leaderboard />
                </Layout>
              }
            />
            <Route
              path="/profile"
              element={
                <Layout>
                  <Profile />
                </Layout>
              }
            />
            <Route
              path="/profile/EditProfile"
              element={
                <Layout>
                  <EditProfile />
                </Layout>
              }
            />
            <Route
              path="/create"
              element={
                <Layout>
                  <CreateRaffle />
                </Layout>
              }
            />
            <Route
              path="/raffle/:slug"
              element={
                <Layout>
                  <RaffleDetail />
                </Layout>
              }
            />

            <Route path="/forbidden" element={<Forbidden />} />

            {/* Admin routes with AdminLayout */}
            <Route element={<ProtectedAdminRoute />}>
              <Route
                path="/admin"
                element={
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/raffles"
                element={
                  <AdminLayout>
                    <AdminRaffles />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/collections"
                element={
                  <AdminLayout>
                    <AdminCollections />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/tokens"
                element={
                  <AdminLayout>
                    <AdminTokens />
                  </AdminLayout>
                }
              />
              {/* <Route
              path="/admin/fees"
              element={
                <AdminLayout>
                  <AdminFees />
                </AdminLayout>
              }
            /> */}
              {/* <Route
              path="/admin/rewards"
              element={
                <AdminLayout>
                  <AdminRewards />
                </AdminLayout>
              }
            /> */}
              <Route
                path="/admin/leaderboards"
                element={
                  <AdminLayout>
                    <AdminLeaderboards />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <AdminLayout>
                    <AdminAnalytics />
                  </AdminLayout>
                }
              />
            </Route>
          </Routes>
          {/* </UmiProvider> */}
        </WalletWrapper>
      </MyWalletWrapper>
    </Router>
  );
}

export default App;
