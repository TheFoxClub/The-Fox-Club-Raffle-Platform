import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import { ShieldX } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <ShieldX className="h-24 w-24 text-destructive" />
      <h1 className="text-4xl font-bold">403 - Access Denied</h1>
      <p className="text-muted-foreground text-center max-w-md">
        You don't have permission to access this page. This area is restricted
        to administrators only.
      </p>
      <Link to="/">
        <Button>Return to Home</Button>
      </Link>
    </div>
  );
}
