import { useState, useEffect, useCallback } from 'react';
import { Plus, MessageCircle, MapPin, Loader2 } from 'lucide-react';
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

type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; latitude: number; longitude: number }
  | { status: 'denied'; message: string }
  | { status: 'unavailable'; message: string };

// Default fallback (NYC)
const DEFAULT_LOCATION = { latitude: 40.7128, longitude: -74.0060 };

export default function ExplorePage() {
  const navigate = useNavigate();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [learners, setLearners] = useState<NearbyLearner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });

  // Get user's real location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState({
        status: 'unavailable',
        message: 'Geolocation is not supported by your browser'
      });
      return;
    }

    setLocationState({ status: 'loading' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState({
          status: 'granted',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        toast.success('Location found!', {
          description: 'Showing nearby learners and meetups.',
        });
      },
      (error) => {
        let message = 'Could not get your location';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location access denied. Enable location in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location unavailable. Please try again.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }
        setLocationState({ status: 'denied', message });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased from 10s to 15s for slower connections
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Get current coordinates (real or fallback)
  const currentLocation = locationState.status === 'granted'
    ? { latitude: locationState.latitude, longitude: locationState.longitude }
    : DEFAULT_LOCATION;

  // Load data when location changes
  useEffect(() => {
    const loadData = async () => {
      console.log('🔍 [ExplorePage] Starting to load data...');
      console.log('📍 Current location:', currentLocation);

      try {
        // Try to load meetups, but don't fail if endpoint doesn't exist
        let meetupsResponse;
        try {
          meetupsResponse = await meetupsApi.getMeetups({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            radiusKm: 50, // 50km radius for meetups (wider than learners)
          });
        } catch (meetupsError) {
          console.warn('⚠️ [ExplorePage] Meetups API failed (endpoint may not be implemented yet):', meetupsError);
          meetupsResponse = { meetups: [], totalPages: 0, totalElements: 0, currentPage: 0 };
        }

        const learnersData = await learnersApi.getNearbyLearners({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radiusKm: 10, // 10km radius for nearby learners
        });

        console.log('✅ [ExplorePage] Data loaded successfully!');
        console.log('📅 Meetups response:', meetupsResponse);
        console.log('📊 Meetups count:', meetupsResponse.meetups.length);
        console.log('👥 Learners response:', learnersData);
        console.log('📊 Learners count:', learnersData.length);

        setMeetups(meetupsResponse.meetups);
        setLearners(learnersData);

        if (meetupsResponse.meetups.length === 0 && learnersData.length === 0) {
          console.warn('⚠️ [ExplorePage] No data found! Check:');
          console.warn('  1. Is backend running?');
          console.warn('  2. Are you logged in?');
          console.warn('  3. Does database have data with coordinates?');
          console.warn('  4. Are coordinates near your location?');
          console.warn('  5. Do users have show_location=true?');
        }
      } catch (error) {
        console.error('❌ [ExplorePage] Failed to load data:', error);
        toast.error('Failed to load nearby data', {
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Only load data once we have location (or fallback)
    if (locationState.status !== 'loading') {
      loadData();
    }
  }, [currentLocation.latitude, currentLocation.longitude, locationState.status]);

  const handleLearnerClick = (learner: NearbyLearner) => {
    navigate(`/user/${learner.id}`);
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
    <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-4xl px-4 py-6">
      {/* Header with Messages button */}
      <div className="flex items-center justify-between mb-4">
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

      {/* Location status */}
      <div className="mb-4">
        {locationState.status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Getting your location...</span>
          </div>
        )}
        {locationState.status === 'granted' && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <MapPin className="h-4 w-4" />
            <span>Showing results near you</span>
          </div>
        )}
        {(locationState.status === 'denied' || locationState.status === 'unavailable') && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{locationState.message}</span>
            </div>
            <Button size="sm" variant="outline" onClick={requestLocation}>
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <div className="mb-6">
        <ExploreMap
          meetups={meetups}
          learners={learners}
          onMeetupClick={handleMeetupClick}
          onLearnerClick={handleLearnerClick}
          userLocation={locationState.status === 'granted' ? currentLocation : undefined}
        />
      </div>

      {/* Nearby learners */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Nearby Learners</h2>
        <div className="grid grid-cols-3 gap-3">
          {learners.map((learner) => (
            <div
              key={learner.id}
              onClick={() => handleLearnerClick(learner)}
              className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center transition-all hover:shadow-soft cursor-pointer active:scale-95"
            >
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-lavender to-accent text-lg font-semibold text-accent-foreground">
                {learner.displayName[0]}
              </div>
              <p className="font-medium text-foreground text-sm">{learner.displayName}</p>
              <div className="flex gap-1 mt-1">
                {learner.languages
                  .filter((l) => l.isLearning)
                  .map((l, i) => (
                    <span key={i} className="text-sm" title={l.name}>
                      {l.flagEmoji}
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
