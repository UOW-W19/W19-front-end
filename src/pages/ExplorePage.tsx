import { useState, useEffect } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Meetup, CreateMeetupRequest } from '@/types/meetup';
import { meetupsApi } from '@/services/api/meetups';
import { Button } from '@/components/ui/button';
import MeetupCard from '@/components/explore/MeetupCard';
import MeetupDetailSheet from '@/components/explore/MeetupDetailSheet';
import CreateMeetupModal from '@/components/explore/CreateMeetupModal';

const nearbyLearners = [
  { id: '1', name: 'Alex', languages: ['🇪🇸', '🇫🇷'], distance: '0.5 km' },
  { id: '2', name: 'Sofia', languages: ['🇯🇵', '🇰🇷'], distance: '1.2 km' },
  { id: '3', name: 'Marco', languages: ['🇩🇪', '🇮🇹'], distance: '2.1 km' },
];

export default function ExplorePage() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    loadMeetups();
  }, []);

  const loadMeetups = async () => {
    try {
      const data = await meetupsApi.getMeetups();
      setMeetups(data);
    } catch (error) {
      console.error('Failed to load meetups:', error);
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Map placeholder */}
      <div className="mb-6 h-48 rounded-2xl bg-gradient-to-br from-sage/30 to-sage-light/30 border border-border flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Map coming soon</p>
        </div>
      </div>

      {/* Nearby learners */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Nearby Learners</h2>
        <div className="grid grid-cols-3 gap-3">
          {nearbyLearners.map((learner) => (
            <div
              key={learner.id}
              className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center transition-all hover:shadow-soft"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-lavender to-accent text-lg font-semibold text-accent-foreground">
                {learner.name[0]}
              </div>
              <p className="font-medium text-foreground text-sm">{learner.name}</p>
              <p className="text-xs text-muted-foreground mb-1">{learner.distance}</p>
              <div className="flex gap-1">
                {learner.languages.map((lang, i) => (
                  <span key={i} className="text-sm">
                    {lang}
                  </span>
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
