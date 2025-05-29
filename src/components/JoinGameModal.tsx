
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type GameSession = Tables<'game_sessions'>;
type GamePlayer = Tables<'game_players'>;

interface JoinGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameJoined: (session: GameSession, player: GamePlayer) => void;
  user: User;
}

const JoinGameModal = ({ open, onOpenChange, onGameJoined, user }: JoinGameModalProps) => {
  const [sessionCode, setSessionCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const joinGame = async () => {
    if (!sessionCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Find the game session
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', sessionCode.toUpperCase())
        .single();

      if (sessionError) {
        toast({
          title: "Error",
          description: "Game not found. Please check the session code.",
          variant: "destructive"
        });
        return;
      }

      // Check password if required
      if (session.password && session.password !== password) {
        toast({
          title: "Error",
          description: "Incorrect password",
          variant: "destructive"
        });
        return;
      }

      // Check if game is joinable
      if (session.status !== 'waiting') {
        toast({
          title: "Error",
          description: "This game is already in progress",
          variant: "destructive"
        });
        return;
      }

      // Check if user is already in this game
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .single();

      if (existingPlayer) {
        toast({
          title: "Already Joined",
          description: "You're already in this game",
        });
        onGameJoined(session, existingPlayer);
        return;
      }

      // Check player count
      const { data: players } = await supabase
        .from('game_players')
        .select('*')
        .eq('session_id', session.id);

      const { data: story } = await supabase
        .from('stories')
        .select('max_players')
        .eq('id', session.story_id)
        .single();

      if (players && story && players.length >= story.max_players) {
        toast({
          title: "Error",
          description: "This game is full",
          variant: "destructive"
        });
        return;
      }

      // Get available characters for this story
      const { data: characters } = await supabase
        .from('characters')
        .select('*')
        .eq('story_id', session.story_id);

      // Get taken characters
      const takenCharacterIds = players?.map(p => p.character_id) || [];
      const availableCharacters = characters?.filter(c => !takenCharacterIds.includes(c.id)) || [];

      if (availableCharacters.length === 0) {
        toast({
          title: "Error",
          description: "No characters available",
          variant: "destructive"
        });
        return;
      }

      // Assign random available character
      const randomCharacter = availableCharacters[Math.floor(Math.random() * availableCharacters.length)];

      // Add player to game
      const { data: player, error: playerError } = await supabase
        .from('game_players')
        .insert({
          session_id: session.id,
          user_id: user.id,
          character_id: randomCharacter.id,
          role: 'detective' // Will be reassigned when game starts
        })
        .select()
        .single();

      if (playerError) {
        throw playerError;
      }

      toast({
        title: "Investigation Joined!",
        description: "Welcome to the mystery",
      });

      onGameJoined(session, player);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-black/90 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-purple-500 to-red-500 bg-clip-text text-transparent">
            Join Investigation
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Enter the session code to join an ongoing mystery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-code">Session Code</Label>
            <Input
              id="session-code"
              placeholder="Enter 4-letter code (e.g., ABCD)"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              className="bg-gray-800 border-gray-600 text-white uppercase"
              maxLength={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-password">Password (if required)</Label>
            <Input
              id="game-password"
              type="password"
              placeholder="Enter password if the game is private"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-500 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={joinGame}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 flex-1"
            >
              {loading ? 'Joining...' : 'Join Mystery'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinGameModal;
