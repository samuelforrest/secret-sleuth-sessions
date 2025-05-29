
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Vote, Users, Clock } from 'lucide-react';
import { Tables } from "@/integrations/supabase/types";

type GameSession = Tables<'game_sessions'>;
type GamePlayer = Tables<'game_players'>;
type Story = Tables<'stories'>;
type Vote = Tables<'votes'>;
type Profile = Tables<'profiles'>;
type Character = Tables<'characters'>;

interface VotingPhaseProps {
  session: GameSession;
  player: GamePlayer;
  players: Array<GamePlayer & { profile: Profile; character: Character }>;
  user: User;
  story: Story | null;
  onGameEnd: () => void;
}

const VotingPhase = ({ session, player, players, user, story, onGameEnd }: VotingPhaseProps) => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isHost = session.host_id === user.id;

  useEffect(() => {
    fetchVotes();
    setupRealtimeSubscriptions();
  }, []);

  const fetchVotes = async () => {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', session.id);

    if (error) {
      console.error('Error fetching votes:', error);
    } else {
      setVotes(data || []);
      const myVote = data?.find(v => v.voter_id === user.id);
      if (myVote) {
        setUserVote(myVote.accused_id);
      }
    }
  };

  const setupRealtimeSubscriptions = () => {
    const votesChannel = supabase
      .channel('votes_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `session_id=eq.${session.id}`
        },
        () => {
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
    };
  };

  const castVote = async (accusedId: string) => {
    if (userVote) {
      toast({
        title: "Already Voted",
        description: "You have already cast your vote",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('votes')
        .insert({
          session_id: session.id,
          voter_id: user.id,
          accused_id: accusedId
        });

      if (error) {
        throw error;
      }

      setUserVote(accusedId);
      toast({
        title: "Vote Cast",
        description: "Your vote has been recorded",
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

  const endVoting = async () => {
    if (!isHost) return;

    setLoading(true);
    try {
      await supabase
        .from('game_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      toast({
        title: "Voting Complete!",
        description: "Time to reveal the truth...",
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

  const voteCounts = players.map(p => ({
    player: p,
    voteCount: votes.filter(v => v.accused_id === p.user_id).length
  })).sort((a, b) => b.voteCount - a.voteCount);

  const totalVotes = votes.length;
  const playersCount = players.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-black text-white p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent mb-4">
            🗳️ Final Vote
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Who do you think is the murderer?
          </p>
          <div className="flex justify-center gap-4">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <Vote className="h-4 w-4 mr-2" />
              {totalVotes} / {playersCount} Votes Cast
            </Badge>
            {userVote && (
              <Badge variant="outline" className="text-lg px-3 py-1">
                ✅ You Voted
              </Badge>
            )}
          </div>
        </div>

        {/* Voting Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {players.map((p) => {
            const voteCount = votes.filter(v => v.accused_id === p.user_id).length;
            const hasVoted = userVote === p.user_id;
            const canVote = !userVote && p.user_id !== user.id;

            return (
              <Card 
                key={p.id}
                className={`transition-all ${
                  hasVoted 
                    ? 'bg-red-500/30 border-red-500 scale-105' 
                    : canVote 
                      ? 'bg-black/40 border-gray-500/30 hover:border-red-500/50 cursor-pointer' 
                      : 'bg-black/20 border-gray-500/20'
                }`}
                onClick={() => canVote && castVote(p.user_id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{p.profile.username}</CardTitle>
                      <p className="text-gray-300 text-sm">{p.character.name}</p>
                    </div>
                    <div className="text-right">
                      {voteCount > 0 && (
                        <Badge variant="destructive" className="mb-2">
                          {voteCount} vote{voteCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {p.user_id === session.host_id && (
                        <Badge variant="outline" className="text-xs">Host</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-2">{p.character.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Click to vote</span>
                    {hasVoted && (
                      <Badge variant="secondary" className="text-xs">
                        Your Vote
                      </Badge>
                    )}
                    {p.user_id === user.id && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Vote Summary */}
        <Card className="bg-black/30 border-yellow-500/30 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Vote Tally
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {voteCounts.map(({ player: p, voteCount }) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
                  <span className="text-white">{p.profile.username} ({p.character.name})</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${playersCount > 0 ? (voteCount / playersCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-gray-300 text-sm w-8">{voteCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Host Controls */}
        {isHost && (
          <div className="text-center">
            <Button
              onClick={endVoting}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg"
            >
              <Clock className="h-5 w-5 mr-2" />
              {loading ? 'Ending Vote...' : 'Reveal Results'}
            </Button>
            <p className="text-gray-400 mt-2 text-sm">
              End voting when everyone has voted or time is up
            </p>
          </div>
        )}

        {/* Waiting Message */}
        {!isHost && (
          <div className="text-center">
            <p className="text-gray-300 text-lg">
              {totalVotes === playersCount 
                ? "All votes are in! Waiting for host to reveal results..." 
                : "Waiting for all players to vote..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingPhase;
