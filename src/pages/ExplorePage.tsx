import { useState, useEffect, useCallback } from 'react';
import { Plus, MessageCircle, MapPin, Loader2, X, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Meetup, NearbyLearner, CreateMeetupRequest } from '@/types/meetup';
import { meetupsApi } from '@/services/api/meetups';
import { learnersApi } from '@/services/api/learners';
import { geocodingApi } from '@/services/api/geocoding';
import { weatherApi, type CurrentWeather } from '@/services/api/weather';
import { Button } from '@/components/ui/button';
import MeetupCard from '@/components/explore/MeetupCard';
import MeetupDetailSheet from '@/components/explore/MeetupDetailSheet';
import CreateMeetupModal from '@/components/explore/CreateMeetupModal';
import ExploreMap from '@/components/explore/ExploreMap';
import LearnerPopupCard from '@/components/explore/LearnerPopupCard';
import MeetupPopupCard from '@/components/explore/MeetupPopupCard';
import UserAvatar from '@/components/common/UserAvatar';
import { useAuth } from '@/contexts';

type LocationState =
  | { status: 'loading' }
  | { status: 'granted'; latitude: number; longitude: number }
  | { status: 'denied'; message: string }
  | { status: 'unavailable'; message: string };

type CurrentWeatherState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'available'; data: CurrentWeather }
  | { status: 'unavailable'; message: string };

// Default fallback (NYC)
const DEFAULT_LOCATION = { latitude: 40.7128, longitude: -74.0060 };
const LOCATION_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedLocation:
  | { latitude: number; longitude: number; timestamp: number }
  | null = null;

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [learners, setLearners] = useState<NearbyLearner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenLearner, setFullscreenLearner] = useState<NearbyLearner | null>(null);
  const [fullscreenMeetup, setFullscreenMeetup] = useState<Meetup | null>(null);
  const [venuePrefill, setVenuePrefill] = useState<{ name: string; address: string } | null>(null);

  const [locationState, setLocationState] = useState<LocationState>({ status: 'loading' });
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherState>({ status: 'idle' });
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string | undefined>(
    user?.location?.trim() || undefined
  );

  // Get user's real location
  const requestLocation = useCallback((forceRefresh = false) => {
    if (!forceRefresh && cachedLocation && Date.now() - cachedLocation.timestamp < LOCATION_CACHE_TTL_MS) {
      setLocationState({
        status: 'granted',
        latitude: cachedLocation.latitude,
        longitude: cachedLocation.longitude,
      });
      return;
    }

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
        cachedLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        };
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

  // Persist coordinates to the backend the first time geolocation is granted.
  // Skipped if the user already has saved coordinates (user.latitude != null).
  useEffect(() => {
    if (locationState.status !== 'granted' || user?.latitude != null) return;
    updateProfile({ latitude: locationState.latitude, longitude: locationState.longitude })
      .catch((error) => {
        console.warn('Failed to persist user coordinates', error);
        toast.error('We could not save your location preferences. Explore will still work for now.');
      });
  }, [locationState, user?.latitude, updateProfile]);

  useEffect(() => {
    const profileLocation = user?.location?.trim() || undefined;

    if (locationState.status !== 'granted') {
      setCurrentLocationLabel(profileLocation);
      return;
    }

    const controller = new AbortController();
    setCurrentLocationLabel(profileLocation);

    geocodingApi.getCurrentLocationLabel({
      latitude: locationState.latitude,
      longitude: locationState.longitude,
      signal: controller.signal,
    })
      .then((label) => {
        setCurrentLocationLabel(label);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        console.warn('[ExplorePage] Failed to resolve current location label:', error);
      });

    return () => controller.abort();
  }, [locationState, user?.location]);

  // Load current weather once precise user coordinates are available.
  useEffect(() => {
    if (locationState.status !== 'granted') {
      setCurrentWeather({ status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setCurrentWeather({ status: 'loading' });

    weatherApi.getCurrentWeather({
      latitude: locationState.latitude,
      longitude: locationState.longitude,
      signal: controller.signal,
    })
      .then((weather) => {
        setCurrentWeather({ status: 'available', data: weather });
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;

        const message = error instanceof Error
          ? error.message
          : 'Could not load current weather';

        setCurrentWeather({ status: 'unavailable', message });
      });

    return () => controller.abort();
  }, [locationState]);

  useEffect(() => {
    if (currentWeather.status === 'unavailable') {
      console.warn('[ExplorePage] Failed to load current weather:', currentWeather.message);
    }
  }, [currentWeather]);

  // Get current coordinates (real or fallback)
  const currentLocation = locationState.status === 'granted'
    ? { latitude: locationState.latitude, longitude: locationState.longitude }
    : DEFAULT_LOCATION;

  // Load data when location changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load meetups, but don't fail if endpoint doesn't exist
        let meetupsResponse;
        try {
          meetupsResponse = await meetupsApi.getMeetups({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            radiusKm: 40000, // 40000km radius to cover the entire world
          });
        } catch {
          meetupsResponse = { meetups: [], totalPages: 0, totalElements: 0, currentPage: 0 };
        }

        const learnersData = await learnersApi.getNearbyLearners({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radiusKm: 40000, // 40000km radius to cover the entire world
        });

        setMeetups(meetupsResponse.meetups);
        setLearners(learnersData);
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
            <Button size="sm" variant="outline" onClick={() => requestLocation(true)}>
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <div className="relative mb-6">
        <ExploreMap
          meetups={meetups}
          learners={learners}
          onMeetupClick={handleMeetupClick}
          onLearnerClick={handleLearnerClick}
          userLocation={locationState.status === 'granted' ? currentLocation : undefined}
        />
        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={() => setIsFullscreen(true)}
          className="absolute bottom-12 right-3 h-10 w-10 rounded-full shadow-md backdrop-blur-sm"
          aria-label="Open fullscreen map"
          title="Open fullscreen map"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Fullscreen map overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          {/* Close button */}
          <button
            onClick={() => { setIsFullscreen(false); setFullscreenLearner(null); setFullscreenMeetup(null); }}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-md"
            aria-label="Close fullscreen map"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Map fills the screen */}
          <ExploreMap
            meetups={meetups}
            learners={learners}
            onMeetupClick={(meetup) => { setFullscreenLearner(null); setFullscreenMeetup(meetup); }}
            onLearnerClick={(learner) => { setFullscreenMeetup(null); setFullscreenLearner(learner); }}
            userLocation={locationState.status === 'granted' ? currentLocation : undefined}
            locationLabel={currentLocationLabel}
            isExtendedView
            currentWeather={currentWeather.status === 'available' ? currentWeather.data : undefined}
            className="relative w-full h-full"
          />

          {/* Learner popup card */}
          {fullscreenLearner && (
            <div className="absolute bottom-24 left-4 right-4 z-10">
              <LearnerPopupCard
                learner={fullscreenLearner}
                onClose={() => setFullscreenLearner(null)}
                onViewProfile={() => {
                  setIsFullscreen(false);
                  setFullscreenLearner(null);
                  navigate(`/user/${fullscreenLearner.id}`);
                }}
                onMessage={() => {
                  setIsFullscreen(false);
                  setFullscreenLearner(null);
                  navigate('/messages');
                }}
                onSuggestVenue={(venue) => {
                  setFullscreenLearner(null);
                  setIsFullscreen(false);
                  setVenuePrefill({ name: venue.name, address: venue.address });
                  setCreateModalOpen(true);
                }}
              />
            </div>
          )}

          {/* Meetup popup card */}
          {fullscreenMeetup && (
            <div className="absolute bottom-24 left-4 right-4 z-10">
              <MeetupPopupCard
                meetup={fullscreenMeetup}
                onClose={() => setFullscreenMeetup(null)}
                onJoin={async (id) => {
                  const updated = await meetupsApi.joinMeetup(id);
                  setMeetups((prev) => prev.map((m) => (m.id === id ? updated : m)));
                  setFullscreenMeetup(updated);
                }}
                onLeave={async (id) => {
                  const updated = await meetupsApi.leaveMeetup(id);
                  setMeetups((prev) => prev.map((m) => (m.id === id ? updated : m)));
                  setFullscreenMeetup(updated);
                }}
              />
            </div>
          )}
        </div>
      )}

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
              <UserAvatar
                name={learner.displayName}
                avatarUrl={learner.avatarUrl}
                className="mb-2 h-12 w-12"
                fallbackClassName="text-lg font-semibold"
              />
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
        open={sheetOpen && !isFullscreen}
        onOpenChange={setSheetOpen}
        onJoin={handleJoin}
        onLeave={handleLeave}
      />

      {/* Create meetup modal */}
      {createModalOpen && (
        <CreateMeetupModal
          isOpen={createModalOpen}
          onClose={() => { setCreateModalOpen(false); setVenuePrefill(null); }}
          onSubmit={handleCreateMeetup}
          prefillLocation={venuePrefill ?? undefined}
        />
      )}
    </div>
  );
}
