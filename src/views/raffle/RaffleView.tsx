import { useParams } from "react-router-dom";

const RaffleView = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gradient mb-8">Raffle #{id}</h1>
      <div className="glass-card p-6">
        <p className="text-muted-foreground">Raffle details coming soon...</p>
      </div>
    </div>
  );
};

export default RaffleView;
