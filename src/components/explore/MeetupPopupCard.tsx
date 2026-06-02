import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, LogOut, MapPin, User, UserPlus, Users, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Meetup } from '@/types/meetup';
import { useAuth } from '@/contexts';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MeetupPopupCardProps {
  meetup: Meetup;
  onClose: () => void;
  onJoin: (id: string) => Promise<void>;
  onLeave: (id: string) => Promise<void>;
}

export default function MeetupPopupCard({ meetup, onClose, onJoin, onLeave }: MeetupPopupCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isHost = user?.id === meetup.organizer.id;
  const isParticipant = meetup.isAttending;
  const maxAttendees = meetup.maxAttendees || Infinity;
  const isFull = meetup.attendeeCount >= maxAttendees;
  const spotsLeft = maxAttendees === Infinity ? Infinity : maxAttendees - meetup.attendeeCount;

  const parsedDate = parseISO(meetup.meetupDate);
  const formattedDate = format(parsedDate, 'MMM d, h:mm a');

  const handleViewOrganizer = () => {
    navigate(user?.id === meetup.organizer.id ? '/profile' : `/user/${meetup.organizer.id}`);
  };

  const handleJoin = async () => {
    if (!user) {
      toast.error('Please log in to join meetups');
      return;
    }

    setIsLoading(true);
    try {
      await onJoin(meetup.id);
      toast.success('You joined the meetup!');
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-slide-up bg-card border border-border rounded-2xl shadow-lg p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-lg shrink-0">{meetup.language.flagEmoji}</span>
        <p className="flex-1 font-semibold text-foreground text-sm line-clamp-1">{meetup.title}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Close meetup details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Compact info row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[160px]">{meetup.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          <span>
            {meetup.attendeeCount}{meetup.maxAttendees ? `/${meetup.maxAttendees}` : ''} going
            {' - '}
            {isFull ? 'Full' : spotsLeft === Infinity ? 'Open' : `${spotsLeft} left`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleViewOrganizer}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 pr-2 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View ${meetup.organizer.displayName}'s profile`}
        >
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarImage src={meetup.organizer.avatarUrl} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
              {meetup.organizer.displayName[0]}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            by <span className="font-medium text-foreground">{meetup.organizer.displayName}</span>
          </span>
        </button>

        {isHost ? (
          <Button variant="secondary" size="sm" disabled className="h-7 px-3 text-xs">
            <User className="h-3 w-3 mr-1" />
            Hosting
          </Button>
        ) : isParticipant ? (
          <Button variant="outline" size="sm" onClick={handleLeave} disabled={isLoading} className="h-7 px-3 text-xs">
            <LogOut className="h-3 w-3 mr-1" />
            {isLoading ? '...' : 'Leave'}
          </Button>
        ) : (
          <Button size="sm" onClick={handleJoin} disabled={isLoading || isFull} className="h-7 px-3 text-xs">
            <UserPlus className="h-3 w-3 mr-1" />
            {isLoading ? '...' : isFull ? 'Full' : 'Join'}
          </Button>
        )}
      </div>
    </div>
  );
}
