
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Users, Vote, Crown, ArrowRight } from 'lucide-react';
import { Tables } from "@/integrations/supabase/types";
import VotingPhase from "./VotingPhase";
import GameResults from "./GameResults";

type GameSession = Tables<'game_sessions'>;
type GamePlayer = Tables<'game_players'>;
type Story = Tables<'stories'>;
type Character = Tables<'characters'>;
type Clue = Tables<'clues'>;
type Profile = Tables<'profiles'>;

interface GamePlayProps {
  session: GameSession;
  player: GamePlayer;
  user: User;
  story: Story | null;
  onGameEnd: () => void;
}

interface PlayerWithDetails extends GamePlayer {
  profile: Profile;
  character: Character;
}

interface ClueWithVisibility extends Clue {
  isVisible: boolean;
}

const GamePlay = ({ session: initialSession, player: initialPlayer, user, story, onGameEnd }: GamePlayProps) => {
  const [session, setSession] = useState(initialSession);
  const [player, setPlayer] = useState(initialPlayer);
  const [players, setPlayers] = useState<PlayerWithDetails[]>([]);
  const [character, setCharacter] = useState<Character | null>(null);
  const [clues, setClues] = useState<ClueWithVisibility[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isHost = session.host_id === user.id;
  const isMurderer = player.role === 'murderer';
  const isVotingRound = session.current_round === session.max_rounds;

  useEffect(() => {
    fetchGameData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchGameData = async () => {
    // Fetch character details
    const { data: characterData } = await supabase
      .from('characters')
      .select('*')
      .eq('id', player.character_id)
      .single();

    if (characterData) {
      setCharacter(characterData);
    }

    // Fetch all players with details
    const { data: playersData } = await supabase
      .from('game_players')
      .select(`
        *,
        profile:profiles!inner(*),
        character:characters!inner(*)
      `)
      .eq('session_id', session.id);

    if (playersData) {
      setPlayers(playersData);
    }

    // Fetch clues for current round
    if (story) {
      const { data: cluesData } = await supabase
        .from('clues')
        .select('*')
        .eq('story_id', story.id)
        .lte('round_number', session.current_round);

      if (cluesData) {
        const cluesWithVisibility = cluesData.map(clue => ({
          ...clue,
          isVisible: clue.round_number <= session.current_round && 
                    (clue.is_for_murderer ? isMurderer : !clue.is_for_murderer)
        }));
        setClues(cluesWithVisibility);
      }
    }
  };

  const setupRealtimeSubscriptions = () => {
    const sessionChannel = supabase
      .channel('game_session_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          setSession(payload.new as GameSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  };

  const nextRound = async () => {
    if (!isHost) return;

    setLoading(true);
    try {
      const newRound = session.current_round + 1;
      let newStatus = session.status;

      // Check if this is the voting round
      if (newRound === session.max_rounds) {
        newStatus = 'voting';
      }

      await supabase
        .from('game_sessions')
        .update({ 
          current_round: newRound,
          status: newStatus
        })
        .eq('id', session.id);

      if (newStatus === 'voting') {
        toast({
          title: "Voting Phase!",
          description: "Time to vote for who you think is the murderer",
        });
      } else {
        toast({
          title: "Next Round",
          description: `Round ${newRound} has begun`,
        });
      }
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

  // Show results if game is completed
  if (session.status === 'completed') {
    return (
      <GameResults
        session={session}
        players={players}
        user={user}
        onGameEnd={onGameEnd}
      />
    );
  }

  // Show voting phase
  if (session.status === 'voting') {
    return (
      <VotingPhase
        session={session}
        player={player}
        players={players}
        user={user}
        story={story}
        onGameEnd={onGameEnd}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-black text-white p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
              {story?.title}
            </h1>
            <p className="text-gray-300">Round {session.current_round} of {session.max_rounds}</p>
          </div>
          <div className="flex gap-4">
            <Badge variant={isMurderer ? "destructive" : "secondary"} className="text-lg px-3 py-1">
              {isMurderer ? "🔪 Murderer" : "🔍 Detective"}
            </Badge>
            {isHost && (
              <Badge variant="outline" className="text-lg px-3 py-1">
                <Crown className="h-4 w-4 mr-1" />
                Host
              </Badge>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Character Info */}
          <div className="lg:col-span-1">
            <Card className="bg-black/40 border-red-500/30 backdrop-blur mb-6">
              <CardHeader>
                <CardTitle className="text-white">Your Character</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {character && (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{character.name}</h3>
                      <p className="text-gray-300 text-sm">{character.description}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-400">Outfit</h4>
                      <p className="text-gray-300 text-sm">{character.outfit}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-400">Background</h4>
                      <p className="text-gray-300 text-sm">{character.background}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Players List (Host View) */}
            {isHost && (
              <Card className="bg-black/40 border-purple-500/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Players ({players.length})
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    As host, you can see all characters but not their roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {players.map((p) => (
                      <div key={p.id} className="p-2 bg-gray-800/50 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-white font-medium">{p.profile.username}</span>
                            <div className="text-sm text-gray-400">{p.character.name}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {p.user_id === session.host_id ? 'Host' : 'Player'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{p.character.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Simple Players List (Non-Host View) */}
            {!isHost && (
              <Card className="bg-black/40 border-gray-500/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Other Detectives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {players.filter(p => p.user_id !== user.id).map((p) => (
                      <div key={p.id} className="p-2 bg-gray-800/50 rounded">
                        <span className="text-white">{p.profile.username}</span>
                        <div className="text-sm text-gray-400">{p.character.name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Clues Section */}
          <div className="lg:col-span-2">
            <Card className="bg-black/30 border-yellow-500/30 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Investigation Clues</CardTitle>
                  {isHost && !isVotingRound && (
                    <Button
                      onClick={nextRound}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {session.current_round === session.max_rounds - 1 ? 'Start Voting' : 'Next Round'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clues.filter(clue => clue.isVisible).map((clue) => (
                    <Card 
                      key={clue.id} 
                      className={`${
                        clue.is_for_murderer 
                          ? 'bg-red-500/20 border-red-500/50' 
                          : 'bg-blue-500/20 border-blue-500/50'
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-lg">{clue.title}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="secondary">Round {clue.round_number}</Badge>
                            {clue.is_for_murderer && (
                              <Badge variant="destructive">Private</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-200">{clue.content}</p>
                      </CardContent>
                    </Card>
                  ))}

                  {clues.filter(clue => clue.isVisible).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No clues available yet. Wait for the host to start the next round.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-black/20 border-gray-500/20 backdrop-blur mt-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <h4 className="font-semibold text-red-400 mb-2">🔍 Gather Clues</h4>
                <p className="text-gray-300 text-sm">
                  Examine each clue carefully and discuss with other players
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">💭 Discuss</h4>
                <p className="text-gray-300 text-sm">
                  Share theories and alibis with other detectives
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-400 mb-2">🗳️ Vote</h4>
                <p className="text-gray-300 text-sm">
                  In the final round, vote for who you think is the murderer
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GamePlay;
