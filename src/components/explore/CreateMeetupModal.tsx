import { useState, useEffect } from "react";
import { X, Globe, Calendar, Clock, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreateMeetupRequest } from "@/types/meetup";
import LocationPicker from "./LocationPicker";
import { LANGUAGES } from "@/services/api/config";

export interface CreateMeetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMeetupRequest) => void;
  prefillLocation?: { name: string; address: string; lat?: number; lng?: number };
}

export function CreateMeetupModal({ isOpen, onClose, onSubmit, prefillLocation }: CreateMeetupModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState(10);

  useEffect(() => {
    if (isOpen && prefillLocation) {
      setLocationName(`${prefillLocation.name}, ${prefillLocation.address}`);
      if (prefillLocation.lat && prefillLocation.lng) {
        setCoords({ lat: prefillLocation.lat, lng: prefillLocation.lng });
      }
    }
  }, [isOpen, prefillLocation]);

  const handleSubmit = () => {
    if (!title.trim() || !locationName.trim() || !date || !time) return;

    // Combine date and time into ISO 8601 format
    const meetupDate = `${date}T${time}:00`;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      languageCode: selectedLanguage.code,
      location: locationName.trim(),
      meetupDate,
      maxAttendees,
      latitude: coords?.lat,
      longitude: coords?.lng,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSelectedLanguage(LANGUAGES[0]);
    setLocationName("");
    setCoords(null);
    setDate("");
    setTime("");
    setMaxAttendees(10);
    onClose();
  };

  const isFormValid = title.trim() &&
    locationName.trim() &&
    date &&
    time;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full bg-card rounded-t-3xl shadow-soft animate-slide-up max-h-[90vh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 -m-2 text-muted-foreground active:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <h2 className="font-semibold text-foreground text-lg">Create Meetup</h2>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="gap-1.5 h-9 px-4 active:scale-95 transition-transform"
          >
            <Send className="h-4 w-4" />
            Create
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Title input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Meetup Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Coffee & Conversation"
              maxLength={100}
              className="w-full p-4 rounded-2xl bg-muted border-0 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          {/* Language selector */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Globe className="h-4 w-4 text-primary" />
              Language
            </label>
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted active:bg-muted/70 transition-colors w-full"
              >
                <span className="text-xl">{selectedLanguage.flag}</span>
                <span className="text-base font-medium text-foreground flex-1 text-left">
                  {selectedLanguage.name}
                </span>
                <Globe className="h-5 w-5 text-muted-foreground" />
              </button>

              {showLanguageDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-2xl border border-border shadow-soft z-[110] py-2 animate-scale-in max-h-60 overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setShowLanguageDropdown(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted transition-colors text-left"
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className="text-base text-foreground">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your meetup..."
              maxLength={500}
              className="w-full min-h-[100px] p-4 rounded-2xl bg-muted border-0 text-foreground text-base placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
            <div className="text-right text-xs text-muted-foreground">
              {description.length}/500
            </div>
          </div>

          {/* Location Picker */}
          <LocationPicker
            onLocationSelect={(loc) => {
              setLocationName(loc.name);
              setCoords(
                loc.lat !== undefined && loc.lng !== undefined
                  ? { lat: loc.lat, lng: loc.lng }
                  : null
              );
            }}
          />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-4 rounded-2xl bg-muted border-0 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Time *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-4 rounded-2xl bg-muted border-0 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              />
            </div>
          </div>

          {/* Max Attendees */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Max Participants
            </label>
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-muted">
              <button
                onClick={() => setMaxAttendees(Math.max(2, maxAttendees - 1))}
                className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground font-bold active:scale-95 transition-transform"
              >
                -
              </button>
              <span className="flex-1 text-center text-lg font-semibold text-foreground">
                {maxAttendees}
              </span>
              <button
                onClick={() => setMaxAttendees(Math.min(50, maxAttendees + 1))}
                className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground font-bold active:scale-95 transition-transform"
              >
                +
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Including yourself
            </p>
          </div>

          {/* Bottom spacing */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

export default CreateMeetupModal;
