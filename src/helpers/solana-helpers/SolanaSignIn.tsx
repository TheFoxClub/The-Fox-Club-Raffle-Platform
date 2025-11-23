import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { type RootState, useAppDispatch } from "../../redux/store";
import { loginUser } from "../../redux/actions/userAction";
import { unwrapResult } from "@reduxjs/toolkit";
import Button from "../../components/ui/Button";

const SolanaSignIn = () => {
  const dispatch = useAppDispatch();
  const { publicKey, signMessage, connected } = useWallet();
  const user = useSelector((state: RootState) => state.user);

  const signIn = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const nonce = Math.floor(Math.random() * 1000000);
    const message = `Sign this message for authenticating with your wallet. Nonce: ${nonce}`;
    const encodedMessage = new TextEncoder().encode(message);

    if (signMessage) {
      try {
        const signature = await signMessage!(encodedMessage);

        const resultAction = await dispatch(
          loginUser({
            nonce,
            signature: Buffer.from(signature).toString("hex"),
            pubkey: Buffer.from(publicKey?.toBytes() || []).toString("hex"),
          })
        );

        const result = unwrapResult(resultAction); // Extracts payload or throws if rejected

        if (!result.success) {
          if (result.message?.toLowerCase().includes("redlist")) {
            toast.error("Access Denied: Your wallet is redlisted.");
          } else {
            toast.error(result.message || "Login failed.");
          }
        }
      } catch (err: any) {
        // Handles rejected thunk (e.g., redlist or other backend error)
        const msg = err?.message || "Signature rejected or login failed.";
        if (msg.toLowerCase().includes("redlist")) {
          toast.error("Access Denied: Your wallet is redlisted.");
        } else {
          toast.error(msg);
        }
      }
    } else {
      toast.warning(
        "Please use another wallet! Your wallet does not support signing message."
      );
    }
  };

  if (user.isAuthenticated) {
    return null;
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={signIn}
      className="rounded glow-primary"
    >
      Sign In
    </Button>
  );
};

export default SolanaSignIn;
