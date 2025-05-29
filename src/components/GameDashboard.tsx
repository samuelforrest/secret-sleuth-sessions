
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Users } from 'lucide-react';
import CreateGameModal from "./CreateGameModal";
import JoinGameModal from "./JoinGameModal";
import GameLobby from "./GameLobby";
import { Tables } from "@/integrations/supabase/types";

type GameSession = Tables<'game_sessions'>;
type GamePlayer = Tables<'game_players'>;

interface GameDashboardProps {
  user: User;
}

const GameDashboard = ({ user }: GameDashboardProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<GamePlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentGame();
  }, [user]);

  const checkCurrentGame = async () => {
    try {
      // Check if user is in an active game
      const { data: playerData, error: playerError } = await supabase
        .from('game_players')
        .select(`
          *,
          session:game_sessions!inner(*)
        `)
        .eq('user_id', user.id)
        .neq('session.status', 'completed')
        .single();

      if (playerError && playerError.code !== 'PGRST116') {
        console.error('Error checking current game:', playerError);
      } else if (playerData) {
        setCurrentPlayer(playerData);
        setCurrentSession(playerData.session);
      }
    } catch (error) {
      console.error('Error checking current game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleGameJoined = (session: GameSession, player: GamePlayer) => {
    setCurrentSession(session);
    setCurrentPlayer(player);
    setShowCreateModal(false);
    setShowJoinModal(false);
  };

  const handleLeaveGame = () => {
    setCurrentSession(null);
    setCurrentPlayer(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-red-900 to-black">
        <div className="text-white text-xl">Loading your investigation...</div>
      </div>
    );
  }

  if (currentSession && currentPlayer) {
    return (
      <GameLobby 
        session={currentSession} 
        player={currentPlayer} 
        user={user}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-black text-white p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
              Detective Dashboard
            </h1>
            <p className="text-gray-300">Welcome back, {user.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card 
            className="bg-black/40 border-red-500/30 backdrop-blur cursor-pointer hover:border-red-500/50 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <CardHeader className="text-center">
              <Plus className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-white">Create Mystery</CardTitle>
              <CardDescription className="text-gray-300">
                Host your own murder mystery party
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-400 text-sm">
                Choose a storyline, set up your lobby, and invite friends to solve the case
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-black/40 border-purple-500/30 backdrop-blur cursor-pointer hover:border-purple-500/50 transition-colors"
            onClick={() => setShowJoinModal(true)}
          >
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-purple-500 mx-auto mb-2" />
              <CardTitle className="text-white">Join Investigation</CardTitle>
              <CardDescription className="text-gray-300">
                Enter a session code to join a game
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-400 text-sm">
                Get assigned a character and help solve the mystery with other detectives
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Games or Instructions */}
        <Card className="bg-black/30 border-gray-500/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="text-red-400 font-semibold mb-2">Step 1: Choose Your Path</div>
                <p className="text-gray-300">Create a new mystery party or join an existing investigation</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="text-purple-400 font-semibold mb-2">Step 2: Get Your Role</div>
                <p className="text-gray-300">Receive your character assignment and secret role</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="text-yellow-400 font-semibold mb-2">Step 3: Solve the Mystery</div>
                <p className="text-gray-300">Gather clues, discuss with others, and vote for the killer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateGameModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        onGameCreated={handleGameJoined}
        user={user}
      />

      <JoinGameModal 
        open={showJoinModal} 
        onOpenChange={setShowJoinModal}
        onGameJoined={handleGameJoined}
        user={user}
      />
    </div>
  );
};

export default GameDashboard;
