// import { Progress } from "../../components/ui/Progress";
import Button from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  User,
  Trophy,
  Flame,
  TrendingUp,
  Award,
  Ticket,
  Calendar,
  Coins,
  CheckCircle,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/Tabs";
import {
  userStats,
  hostedRaffles,
  purchasedTickets,
} from "../../dummydata/profileData";
import { useState } from "react";
import { Link } from "react-router-dom";

const Profile = () => {
  const [statsArray] = useState(userStats);
  const [user] = statsArray;

  const {
    wallet,
    level,
    rank,
    streak,
    xp,
    totalSpent,
    rafflesWon,
    ticketsPurchased,
    reputation,
  } = user || {};

  // Handle loading/empty state gracefully
  if (!user || Object.keys(user).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-300">
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="space-y-8">
        <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center justify-center bg-gradient-primary h-24 w-24 rounded-full gradient-primary glow-primary">
              <User className="h-12 w-12" />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{wallet}</h1>
                  <div className="top-4 right-4 bg-green-900/30 backdrop-blur-sm text-green-400 px-3 hover:bg-primary hover:text-white py-1 rounded-full flex items-center gap-2 text-sm">
                    <CheckCircle size={12} /> Verified
                  </div>
                </div>
                <div className="flex items-center text-sm gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span className="text-muted-foreground">Level {level}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      #{rank} Ranked
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground">
                      {streak} Day Streak
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">XP Progress</span>
                <span className="font-semibold">{xp} / 15000 XP</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full gradient-primary"
                  style={{ width: `${(xp / 15000) * 100}%` }}
                />
              </div>
            </div>

            <Link to="/profile/EditProfile">
              <Button variant="outline">Edit Profile</Button>
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <Coins className="h-8 w-8 mx-auto text-accent" />
            <p className="text-2xl font-bold">{totalSpent} SOL</p>
            <p className="text-sm text-muted-foreground">Total Spent</p>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <Trophy className="h-8 w-8 mx-auto text-primary" />
            <p className="text-2xl font-bold">{rafflesWon}</p>
            <p className="text-sm text-muted-foreground">Raffles Won</p>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <Ticket className="h-8 w-8 mx-auto text-secondary" />
            <p className="text-2xl font-bold">{ticketsPurchased}</p>
            <p className="text-sm text-muted-foreground">Tickets Bought</p>
          </Card>

          <Card className="bg-card/50 backdrop-blur-xl border border-border/50 text-center p-6 space-y-2">
            <TrendingUp className="h-8 w-8 mx-auto text-green-500" />
            <p className="text-2xl font-bold">{reputation}%</p>
            <p className="text-sm text-muted-foreground">Reputation</p>
          </Card>
        </div>

        {/* Tabs section */}
        <Tabs defaultValue="purchasedTickets" className="space-y-4 mt-10">
          <TabsList className=" p-1 w-full sm:w-auto">
            <TabsTrigger
              value="purchasedTickets"
              className="flex-1 md:flex-none"
            >
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="hostedRaffles" className="flex-1 md:flex-none">
              Hosted Raffles
            </TabsTrigger>
            <TabsTrigger value="won" className="flex-1 md:flex-none">
              Wins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchasedTickets" className="space-y-4">
            {purchasedTickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="bg-card/50 backdrop-blur-xl p-6 border border-border/50"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">
                        {ticket.raffleTitle}
                      </h3>
                      {ticket.status === "active" ? (
                        <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-secondary text-white w-fit">
                          Active
                        </div>
                      ) : ticket.status === "won" ? (
                        <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary text-white w-fit">
                          Won
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                      <div className="flex items-center gap-1">
                        <Ticket className="h-4 w-4" />
                        <span>{ticket.tickets} tickets</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4" />
                        <span>{ticket.spent} SOL spent</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Ends {ticket.endDate}</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline">View Raffle</Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="hostedRaffles" className="space-y-6">
            {hostedRaffles.map((raffle) => (
              <Card
                key={raffle.id}
                className="bg-card/50 backdrop-blur-xl border border-border/50 p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold">{raffle.title}</h3>
                      {raffle.status === "active" ? (
                        <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-primary text-white w-fit">
                          Active
                        </div>
                      ) : raffle.status === "completed" ? (
                        <div className="top-3 left-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-secondary text-white w-fit">
                          Completed
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                      <div className="flex items-center gap-1">
                        <Ticket className="h-4 w-4" />
                        <span>
                          {raffle.ticketsSold} / {raffle.totalTickets}sold
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-accent" />
                        <span>{raffle.revenue} SOL revenue</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{raffle.endDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline">Manage</Button>
                    <Button variant="outline">View</Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="won" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-xl border border-border/50 p-6">
              <div className="flex items-center gap-4">
                <Trophy className="h-12 w-12 text-accent" />
                <div>
                  <h3 className="font-bold text-lg">Fox Club Merchandise</h3>
                  <p className="text-sm text-muted-foreground">
                    Won on October 15, 2025 • Prize claimed
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
