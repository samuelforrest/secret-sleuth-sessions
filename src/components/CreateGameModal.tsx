
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } = useToast";
import { Tables } from "@/integrations/supabase/types";

type Story = Tables<'stories'>;
type GameSession = Tables<'game_sessions'>;
type GamePlayer = Tables<'game_players'>;

interface CreateGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameCreated: (session: GameSession, player: GamePlayer) => void;
  user: User;
}

const CreateGameModal = ({ open, onOpenChange, onGameCreated, user }: CreateGameModalProps) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchStories();
    }
  }, [open]);

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('title');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load stories",
        variant: "destructive"
      });
    } else {
      setStories(data || []);
    }
  };

  const createGame = async () => {
    if (!selectedStory) return;

    setLoading(true);
    try {
      // Generate session code
      const { data: sessionCode, error: codeError } = await supabase
        .rpc('generate_session_code');

      if (codeError) {
        throw codeError;
      }

      // Create game session
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          story_id: selectedStory.id,
          host_id: user.id,
          session_code: sessionCode,
          password: password || null,
          max_rounds: selectedStory.total_rounds
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Get characters for this story
      const { data: characters, error: charactersError } = await supabase
        .from('characters')
        .select('*')
        .eq('story_id', selectedStory.id);

      if (charactersError) {
        throw charactersError;
      }

      // Assign random character to host
      const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
      
      // Add host as player (always detective initially, role assignment happens when game starts)
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
        title: "Mystery Created!",
        description: `Session code: ${sessionCode}`,
      });

      onGameCreated(session, player);
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
      <DialogContent className="sm:max-w-4xl bg-black/90 border-red-500/30 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
            Create Mystery Party
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Choose a storyline and set up your murder mystery game
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Story Selection */}
          <div>
            <Label className="text-lg font-semibold mb-4 block">Choose Your Mystery</Label>
            <div className="grid gap-4">
              {stories.map((story) => (
                <Card 
                  key={story.id}
                  className={`cursor-pointer transition-colors ${
                    selectedStory?.id === story.id 
                      ? 'bg-red-500/20 border-red-500' 
                      : 'bg-black/40 border-gray-500/30 hover:border-red-500/50'
                  }`}
                  onClick={() => setSelectedStory(story)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{story.title}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{story.min_players}-{story.max_players} Players</Badge>
                        <Badge variant="secondary">{story.total_rounds} Rounds</Badge>
                      </div>
                    </div>
                    <CardDescription className="text-gray-300">{story.setting}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300">{story.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Game Settings */}
          {selectedStory && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Game Settings</Label>
              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave empty for public game"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
          )}

          {/* Create Button */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-500 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={createGame}
              disabled={!selectedStory || loading}
              className="bg-red-600 hover:bg-red-700 flex-1"
            >
              {loading ? 'Creating Mystery...' : 'Create Game'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGameModal;
