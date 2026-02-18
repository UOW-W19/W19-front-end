import { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Users, User, LogOut, UserPlus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Meetup, MeetupAttendee } from '@/types/meetup';
import { meetupsApi } from '@/services/api/meetups';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface MeetupDetailSheetProps {
  meetup: Meetup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (id: string) => Promise<void>;
  onLeave: (id: string) => Promise<void>;
}

export default function MeetupDetailSheet({
  meetup,
  open,
  onOpenChange,
  onJoin,
  onLeave,
}: MeetupDetailSheetProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [attendees, setAttendees] = useState<MeetupAttendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  useEffect(() => {
    if (meetup && open) {
      setLoadingAttendees(true);
      meetupsApi.getAttendees(meetup.id)
        .then(setAttendees)
        .catch((err) => console.error('Failed to load attendees:', err))
        .finally(() => setLoadingAttendees(false));
    } else {
      setAttendees([]);
    }
  }, [meetup, open]);

  if (!meetup) return null;

  const isHost = user?.id === meetup.organizer.id;
  const isParticipant = meetup.isAttending; // Use the boolean flag from backend
  const maxAttendees = meetup.maxAttendees || Infinity;
  const isFull = meetup.attendeeCount >= maxAttendees;
  const spotsLeft = maxAttendees === Infinity ? Infinity : maxAttendees - meetup.attendeeCount;

  const parsedDate = parseISO(meetup.meetupDate);
  const formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(parsedDate, 'h:mm a');

  const handleJoin = async () => {
    if (!user) {
      toast.error('Please log in to join meetups');
      return;
    }

    setIsLoading(true);
    try {
      await onJoin(meetup.id);
      toast.success('You joined the meetup!');
      // Refresh attendees
      meetupsApi.getAttendees(meetup.id).then(setAttendees);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await onLeave(meetup.id);
      toast.success('You left the meetup');
      // Refresh attendees
      meetupsApi.getAttendees(meetup.id).then(setAttendees);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-4 pb-8">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="text-xl">{meetup.language.flagEmoji}</span>
            <span>{meetup.language.name}</span>
          </div>
          <SheetTitle className="text-xl text-left">{meetup.title}</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-180px)] space-y-6">
          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{formattedDate}</p>
                <p className="text-muted-foreground">Date</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{formattedTime}</p>
                <p className="text-muted-foreground">Time</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{meetup.location}</p>
                <p className="text-muted-foreground">Location</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {meetup.attendeeCount} {meetup.maxAttendees ? `/ ${meetup.maxAttendees}` : ''} participants
                </p>
                <p className="text-muted-foreground">
                  {isFull ? 'Meetup is full' : spotsLeft === Infinity ? 'Open to all' : `${spotsLeft} spots available`}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {meetup.description && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {meetup.description}
              </p>
            </div>
          )}

          {/* Host */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Host</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={meetup.organizer.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-lavender to-accent text-accent-foreground">
                  {meetup.organizer.displayName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{meetup.organizer.displayName}</p>
                <p className="text-xs text-muted-foreground">Organizer</p>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              Participants ({attendees.length})
              {loadingAttendees && <span className="text-xs font-normal text-muted-foreground animate-pulse">Loading...</span>}
            </h3>

            {attendees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attendees.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={participant.avatarUrl} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {participant.displayName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">
                      {participant.displayName}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              !loadingAttendees && <p className="text-sm text-muted-foreground">No participants yet.</p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          {isHost ? (
            <Button variant="secondary" className="w-full" disabled>
              <User className="h-4 w-4 mr-2" />
              You're hosting this meetup
            </Button>
          ) : isParticipant ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLeave}
              disabled={isLoading}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoading ? 'Leaving...' : 'Leave Meetup'}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={isLoading || isFull}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? 'Joining...' : isFull ? 'Meetup is Full' : 'Join Meetup'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
