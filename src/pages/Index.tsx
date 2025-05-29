
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skull, Users, Clock, Shield } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import AuthModal from "@/components/AuthModal";
import GameDashboard from "@/components/GameDashboard";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-red-900 to-black">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <GameDashboard user={user} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Skull className="h-16 w-16 text-red-500 mr-4" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">
              MurderMysteryPro
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Step into the shadows of suspense. Uncover secrets, solve mysteries, and catch killers in real-time multiplayer murder mystery experiences.
          </p>
          <Button 
            size="lg" 
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg rounded-full"
            onClick={() => setShowAuthModal(true)}
          >
            Enter the Mystery
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-black/30 border-red-500/20 backdrop-blur">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-white">Multiplayer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-center">Join up to 8 players in immersive real-time mystery experiences</p>
            </CardContent>
          </Card>
          
          <Card className="bg-black/30 border-purple-500/20 backdrop-blur">
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 text-purple-500 mx-auto mb-2" />
              <CardTitle className="text-white">Real-Time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-center">Experience live gameplay with synchronized clues and voting</p>
            </CardContent>
          </Card>
          
          <Card className="bg-black/30 border-yellow-500/20 backdrop-blur">
            <CardHeader className="text-center">
              <Skull className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <CardTitle className="text-white">4 Mysteries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-center">Explore unique storylines from mansions to masquerade balls</p>
            </CardContent>
          </Card>
          
          <Card className="bg-black/30 border-green-500/20 backdrop-blur">
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle className="text-white">Private Lobbies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 text-center">Create password-protected games for you and your friends</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Modes */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-8">Choose Your Mystery</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-black/40 border-red-500/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-2xl">The Mansion Murder</CardTitle>
                <CardDescription className="text-gray-300">
                  Victorian Mansion • 3-8 Players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  A wealthy businessman is found dead in his study during a dinner party. Someone among the guests is the killer.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">4 Rounds</Badge>
                  <Badge variant="secondary">8 Characters</Badge>
                  <Badge variant="secondary">Classic Mystery</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-black/40 border-purple-500/30 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Death on the Orient Express</CardTitle>
                <CardDescription className="text-gray-300">
                  Luxury Train • 3-8 Players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  A passenger is murdered aboard the famous train. The killer is still on board.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">4 Rounds</Badge>
                  <Badge variant="secondary">Mobile Optimized</Badge>
                  <Badge variant="secondary">Agatha Christie Inspired</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-red-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
              <h3 className="text-xl font-semibold mb-2">Join or Create</h3>
              <p className="text-gray-300">Create a private lobby or join with a session code</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
              <h3 className="text-xl font-semibold mb-2">Get Your Role</h3>
              <p className="text-gray-300">Receive your character and secret role assignment</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
              <h3 className="text-xl font-semibold mb-2">Solve & Vote</h3>
              <p className="text-gray-300">Gather clues, discuss, and vote for the murderer</p>
            </div>
          </div>
        </div>
      </div>

      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
      />
    </div>
  );
};

export default Index;
