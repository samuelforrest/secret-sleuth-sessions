
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Users, Home, Trophy } from 'lucide-react';
import { Tables } from "@/integrations/supabase/types";

type GameSession = Tables<'game_sessions'>;
type Vote = Tables<'votes'>;
type Profile = Tables<'profiles'>;
type Character = Tables<'characters'>;
type GamePlayer = Tables<'game_players'>;

interface GameResultsProps {
  session: GameSession;
  players: Array<GamePlayer & { profile: Profile; character: Character }>;
  user: User;
  onGameEnd: () => void;
}

const GameResults = ({ session, players, user, onGameEnd }: GameResultsProps) => {
  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    fetchVotes();
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
    }
  };

  const murderer = players.find(p => p.role === 'murderer');
  const detectives = players.filter(p => p.role === 'detective');

  // Calculate vote results
  const voteCounts = players.map(p => ({
    player: p,
    voteCount: votes.filter(v => v.accused_id === p.user_id).length
  })).sort((a, b) => b.voteCount - a.voteCount);

  const mostVoted = voteCounts[0];
  const detectivesWon = mostVoted?.player.role === 'murderer' && mostVoted.voteCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-black text-white p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Results Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">
            {detectivesWon ? (
              <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                🎉 Detectives Win!
              </span>
            ) : (
              <span className="bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
                💀 Murderer Wins!
              </span>
            )}
          </h1>
          <p className="text-xl text-gray-300">
            {detectivesWon 
              ? "The murderer has been caught! Justice prevails."
              : "The murderer got away with it! The perfect crime."}
          </p>
        </div>

        {/* Murderer Reveal */}
        <Card className="bg-black/40 border-red-500/50 backdrop-blur mb-8">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center gap-2">
              🔪 The Murderer Revealed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {murderer && (
              <div className="flex items-center justify-between p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                <div>
                  <h3 className="text-xl font-bold text-white">{murderer.profile.username}</h3>
                  <p className="text-gray-300">Playing as {murderer.character.name}</p>
                  <p className="text-gray-400 text-sm mt-1">{murderer.character.description}</p>
                </div>
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  Murderer
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vote Results */}
        <Card className="bg-black/30 border-yellow-500/30 backdrop-blur mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Final Vote Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {voteCounts.map(({ player: p, voteCount }, index) => (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    p.role === 'murderer' 
                      ? 'bg-red-500/20 border border-red-500/30' 
                      : 'bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-white font-semibold">{p.profile.username}</span>
                      <div className="text-gray-400 text-sm">{p.character.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
                    {p.role === 'murderer' && (
                      <Badge variant="destructive" className="text-xs">Actual Murderer</Badge>
                    )}
                    {index === 0 && voteCount > 0 && (
                      <Badge variant="secondary" className="text-xs">Most Suspected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Player Summary */}
        <Card className="bg-black/20 border-gray-500/20 backdrop-blur mb-8">
          <CardHeader>
            <CardTitle className="text-white">All Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {players.map((p) => (
                <div 
                  key={p.id} 
                  className={`p-3 rounded-lg border ${
                    p.role === 'murderer' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{p.profile.username}</span>
                    <div className="flex gap-1">
                      <Badge variant={p.role === 'murderer' ? 'destructive' : 'secondary'}>
                        {p.role === 'murderer' ? '🔪 Murderer' : '🔍 Detective'}
                      </Badge>
                      {p.user_id === session.host_id && (
                        <Badge variant="outline" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Host
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    <div>Character: {p.character.name}</div>
                    <div>Votes received: {votes.filter(v => v.accused_id === p.user_id).length}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Stats */}
        <Card className="bg-black/20 border-purple-500/20 backdrop-blur mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Game Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-400">{players.length}</div>
                <div className="text-gray-300 text-sm">Players</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{session.max_rounds}</div>
                <div className="text-gray-300 text-sm">Rounds</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{votes.length}</div>
                <div className="text-gray-300 text-sm">Votes Cast</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return to Dashboard */}
        <div className="text-center">
          <Button
            onClick={onGameEnd}
            className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
          >
            <Home className="h-5 w-5 mr-2" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameResults;
