import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Play, ArrowLeft } from 'lucide-react';
import { Tables } from "@/integrations/supabase/types";
import GamePlay from "./GamePlay";

type GameSession = Tables<'game_sessions'>;
type GamePlayer = Tables<'game_players'>;
type Story = Tables<'stories'>;
type Character = Tables<'characters'>;
type Profile = Tables<'profiles'>;

interface GameLobbyProps {
  session: GameSession;
  player: GamePlayer;
  user: User;
  onLeaveGame: () => void;
}

interface PlayerWithDetails extends GamePlayer {
  profile: Profile;
  character: Character;
}

const GameLobby = ({ session: initialSession, player: initialPlayer, user, onLeaveGame }: GameLobbyProps) => {
  const [session, setSession] = useState(initialSession);
  const [player, setPlayer] = useState(initialPlayer);
  const [story, setStory] = useState<Story | null>(null);
  const [players, setPlayers] = useState<PlayerWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isHost = session.host_id === user.id;

  useEffect(() => {
    fetchGameData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchGameData = async () => {
    // Fetch story details
    const { data: storyData } = await supabase
      .from('stories')
      .select('*')
      .eq('id', session.story_id)
      .single();

    if (storyData) {
      setStory(storyData);
    }

    // Fetch players with their profiles and characters separately to avoid join issues
    const { data: playersData } = await supabase
      .from('game_players')
      .select('*')
      .eq('session_id', session.id);

    if (playersData) {
      // Fetch profiles and characters separately
      const userIds = playersData.map(p => p.user_id);
      const characterIds = playersData.map(p => p.character_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const { data: characters } = await supabase
        .from('characters')
        .select('*')
        .in('id', characterIds);

      // Combine the data
      const playersWithDetails = playersData.map(player => {
        const profile = profiles?.find(p => p.id === player.user_id);
        const character = characters?.find(c => c.id === player.character_id);
        
        return {
          ...player,
          profile: profile!,
          character: character!
        };
      }).filter(p => p.profile && p.character);

      setPlayers(playersWithDetails);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to game session changes
    const sessionChannel = supabase
      .channel('session_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSession(payload.new as GameSession);
          }
        }
      )
      .subscribe();

    // Subscribe to player changes
    const playersChannel = supabase
      .channel('players_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `session_id=eq.${session.id}`
        },
        () => {
          fetchGameData(); // Refetch all player data when players change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(playersChannel);
    };
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(session.session_code);
    toast({
      title: "Code Copied!",
      description: "Session code copied to clipboard",
    });
  };

  const startGame = async () => {
    if (players.length < (story?.min_players || 3)) {
      toast({
        title: "Not Enough Players",
        description: `Need at least ${story?.min_players || 3} players to start`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Randomly assign roles (1 murderer, rest detectives)
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const murdererIndex = Math.floor(Math.random() * shuffledPlayers.length);

      // Update all players with their roles
      for (let i = 0; i < shuffledPlayers.length; i++) {
        const playerToUpdate = shuffledPlayers[i];
        const role = i === murdererIndex ? 'murderer' : 'detective';

        await supabase
          .from('game_players')
          .update({ role })
          .eq('id', playerToUpdate.id);
      }

      // Update game session status
      await supabase
        .from('game_sessions')
        .update({ 
          status: 'in_progress',
          current_round: 1 
        })
        .eq('id', session.id);

      toast({
        title: "Mystery Begins!",
        description: "The investigation has started",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveGame = async () => {
    try {
      await supabase
        .from('game_players')
        .delete()
        .eq('id', player.id);

      toast({
        title: "Left Investigation",
        description: "You have left the game",
      });

      onLeaveGame();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // If game is in progress, show the gameplay component
  if (session.status === 'in_progress' || session.status === 'voting') {
    return (
      <GamePlay
        session={session}
        player={player}
        user={user}
        story={story}
        onGameEnd={onLeaveGame}
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
              Mystery Lobby
            </h1>
            <p className="text-gray-300">{story?.title || 'Loading...'}</p>
          </div>
          <Button
            variant="outline"
            onClick={leaveGame}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Leave Game
          </Button>
        </div>

        {/* Game Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-black/40 border-red-500/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Session Code:</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="text-lg px-3 py-1 cursor-pointer hover:bg-gray-600"
                    onClick={copySessionCode}
                  >
                    {session.session_code}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={copySessionCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {session.password && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Password Protected:</span>
                  <Badge variant="outline">Yes</Badge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Setting:</span>
                <span className="text-white">{story?.setting}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Players ({players.length}/{story?.max_players})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                    <div>
                      <span className="text-white">{p.profile.username}</span>
                      {p.user_id === session.host_id && (
                        <Badge variant="secondary" className="ml-2">Host</Badge>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">{p.character.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Story Info */}
        {story && (
          <Card className="bg-black/30 border-gray-500/20 backdrop-blur mb-8">
            <CardHeader>
              <CardTitle className="text-white">{story.title}</CardTitle>
              <CardDescription className="text-gray-300">{story.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Badge variant="secondary">{story.min_players}-{story.max_players} Players</Badge>
                <Badge variant="secondary">{story.total_rounds} Rounds</Badge>
                <Badge variant="secondary">{story.setting}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start Game Button (Host Only) */}
        {isHost && (
          <div className="text-center">
            <Button
              onClick={startGame}
              disabled={loading || players.length < (story?.min_players || 3)}
              className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg"
            >
              <Play className="h-5 w-5 mr-2" />
              {loading ? 'Starting Mystery...' : 'Start Investigation'}
            </Button>
            {players.length < (story?.min_players || 3) && (
              <p className="text-gray-400 mt-2">
                Need at least {story?.min_players || 3} players to start
              </p>
            )}
          </div>
        )}

        {/* Waiting Message (Non-Host) */}
        {!isHost && (
          <div className="text-center">
            <p className="text-gray-300 text-lg">
              Waiting for the host to start the investigation...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameLobby;
