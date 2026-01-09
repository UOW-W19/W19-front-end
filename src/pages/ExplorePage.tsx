import { useState, useEffect } from 'react';
import { Plus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Meetup, NearbyLearner, CreateMeetupRequest } from '@/types/meetup';
import { meetupsApi } from '@/services/api/meetups';
import { learnersApi } from '@/services/api/learners';
import { Button } from '@/components/ui/button';
import MeetupCard from '@/components/explore/MeetupCard';
import MeetupDetailSheet from '@/components/explore/MeetupDetailSheet';
import CreateMeetupModal from '@/components/explore/CreateMeetupModal';
import ExploreMap from '@/components/explore/ExploreMap';
export default function ExplorePage() {
  const navigate = useNavigate();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [learners, setLearners] = useState<NearbyLearner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meetupsData, learnersData] = await Promise.all([
        meetupsApi.getMeetups(),
        learnersApi.getNearbyLearners(),
      ]);
      setMeetups(meetupsData);
      setLearners(learnersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeetupClick = (meetup: Meetup) => {
    setSelectedMeetup(meetup);
    setSheetOpen(true);
  };

  const handleJoin = async (id: string) => {
    const updated = await meetupsApi.joinMeetup(id);
    setMeetups((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setSelectedMeetup(updated);
  };

  const handleLeave = async (id: string) => {
    const updated = await meetupsApi.leaveMeetup(id);
    setMeetups((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setSelectedMeetup(updated);
  };

  const handleCreateMeetup = async (data: CreateMeetupRequest) => {
    try {
      const newMeetup = await meetupsApi.createMeetup(data);
      setMeetups((prev) => [newMeetup, ...prev]);
      toast.success('Meetup created!', {
        description: `"${newMeetup.title}" is now live.`,
      });
    } catch (error) {
      toast.error('Failed to create meetup', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  // Helper to get language flags
  const getLanguageFlags = (languages: string[]) => {
    const flagMap: Record<string, string> = {
      Spanish: '🇪🇸', French: '🇫🇷', Japanese: '🇯🇵', Korean: '🇰🇷',
      German: '🇩🇪', Italian: '🇮🇹', English: '🇬🇧', Portuguese: '🇧🇷',
    };
    return languages.map(l => flagMap[l] || '🌐');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header with Messages button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Explore</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/messages')}
          className="rounded-full"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* Interactive Map */}
      <div className="mb-6">
        <ExploreMap
          meetups={meetups}
          learners={learners}
          onMeetupClick={handleMeetupClick}
        />
      </div>

      {/* Nearby learners */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Nearby Learners</h2>
        <div className="grid grid-cols-3 gap-3">
          {learners.map((learner) => (
            <div
              key={learner.id}
              className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center transition-all hover:shadow-soft"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-lavender to-accent text-lg font-semibold text-accent-foreground">
                {learner.displayName[0]}
              </div>
              <p className="font-medium text-foreground text-sm">{learner.displayName}</p>
              <div className="flex gap-1 mt-1">
                {getLanguageFlags(learner.languages.learning).map((flag, i) => (
                  <span key={i} className="text-sm">{flag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming meetups */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming Meetups</h2>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : meetups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No meetups yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetups.map((meetup) => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                onClick={() => handleMeetupClick(meetup)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Meetup detail sheet */}
      <MeetupDetailSheet
        meetup={selectedMeetup}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onJoin={handleJoin}
        onLeave={handleLeave}
      />

      {/* Create meetup modal */}
      <CreateMeetupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateMeetup}
      />
    </div>
  );
}
