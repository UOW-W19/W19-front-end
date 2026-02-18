import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin, X } from "lucide-react";
import { placesApi, type PlacePrediction } from "@/services/api/places";

interface LocationPickerProps {
    onLocationSelect: (location: { name: string; lat: number; lng: number }) => void;
    initialLocation?: string;
}

export default function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
    const [query, setQuery] = useState(initialLocation || "");
    const [results, setResults] = useState<PlacePrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (searchQuery: string) => {
        setQuery(searchQuery);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!searchQuery.trim() || searchQuery.length < 3) {
            setResults([]);
            setShowResults(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await placesApi.search(searchQuery);
                if (data.suggestions) {
                    setResults(data.suggestions.map(s => s.placePrediction));
                    setShowResults(true);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error("Places autocomplete error:", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    const handleSelect = async (prediction: PlacePrediction) => {
        const { placeId, text } = prediction;
        const displayName = text.text;

        setQuery(displayName);
        setShowResults(false);
        setLoading(true);

        try {
            const place = await placesApi.getDetails(placeId);

            if (place.location) {
                onLocationSelect({
                    name: place.displayName?.text || displayName,
                    lat: place.location.latitude,
                    lng: place.location.longitude,
                });
            }
        } catch (error) {
            console.error("Place details error:", error);
            // Still set the name even if we can't get coordinates
            onLocationSelect({ name: displayName, lat: 0, lng: 0 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2 relative" ref={wrapperRef}>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Location *
            </label>

            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if (results.length > 0) setShowResults(true); }}
                    placeholder="Search for a location (e.g., UOW Library, Wollongong)"
                    className="w-full p-4 pl-11 rounded-2xl bg-muted border-0 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Clear button */}
                {!loading && query && (
                    <button
                        onClick={() => {
                            setQuery("");
                            setResults([]);
                            setShowResults(false);
                            onLocationSelect({ name: "", lat: 0, lng: 0 });
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Autocomplete Dropdown */}
            {showResults && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-popover rounded-2xl border border-border shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    {results.map((prediction) => {
                        const { placeId, text, structuredFormat } = prediction;
                        const mainText = structuredFormat?.mainText?.text || text.text;
                        const secondaryText = structuredFormat?.secondaryText?.text;
                        return (
                            <button
                                key={placeId}
                                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0 flex items-start gap-3"
                                onClick={() => handleSelect(prediction)}
                            >
                                <MapPin className="h-4 w-4 mt-1 text-primary shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-foreground truncate">{mainText}</span>
                                    {secondaryText && (
                                        <span className="text-xs text-muted-foreground truncate">{secondaryText}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    <div className="px-3 py-2 bg-muted/30 text-[10px] text-muted-foreground text-center">
                        Powered by Google
                    </div>
                </div>
            )}
        </div>
    );
}
