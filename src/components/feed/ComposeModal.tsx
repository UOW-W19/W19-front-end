import { useState } from "react";
import { X, Globe, MapPin, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Post } from "@/types";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: Omit<Post, "id" | "time" | "reactions">) => void;
}

const languages = [
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
];

export default function ComposeModal({ isOpen, onClose, onSubmit }: ComposeModalProps) {
  const [content, setContent] = useState("");
  const [translation, setTranslation] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;

    onSubmit({
      author: {
        name: "You",
        avatar: "Y",
        language: selectedLanguage.name,
        flag: selectedLanguage.flag,
      },
      content: content.trim(),
      translation: translation.trim() || "Translation pending...",
      location: "Your Location",
      distance: "0 km",
    });

    setContent("");
    setTranslation("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal - full width on mobile, slides up from bottom */}
      <div className="relative w-full bg-card rounded-t-3xl shadow-soft animate-slide-up max-h-[85vh] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Drag handle for mobile */}
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
          <h2 className="font-semibold text-foreground text-lg">Create Post</h2>
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="gap-1.5 h-9 px-4 active:scale-95 transition-transform"
          >
            <Send className="h-4 w-4" />
            Post
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted active:bg-muted/70 transition-colors w-full"
            >
              <span className="text-xl">{selectedLanguage.flag}</span>
              <span className="text-base font-medium text-foreground flex-1 text-left">{selectedLanguage.name}</span>
              <Globe className="h-5 w-5 text-muted-foreground" />
            </button>

            {showLanguageDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-2xl border border-border shadow-soft z-10 py-2 animate-scale-in max-h-64 overflow-y-auto">
                {languages.map((lang) => (
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

          {/* Main content input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Write in {selectedLanguage.name}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Share something in ${selectedLanguage.name}...`}
              className="w-full min-h-[140px] p-4 rounded-2xl bg-muted border-0 text-foreground text-base placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
            <div className="text-right text-xs text-muted-foreground">
              {content.length} characters
            </div>
          </div>

          {/* Translation input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Globe className="h-4 w-4 text-sage" />
              English translation (optional)
            </label>
            <textarea
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Add a translation to help others learn..."
              className="w-full min-h-[100px] p-4 rounded-2xl bg-muted border-0 text-foreground text-base placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 transition-shadow"
            />
          </div>

          {/* Location hint */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4">
            <MapPin className="h-4 w-4" />
            <span>Location will be added automatically</span>
          </div>
        </div>
      </div>
    </div>
  );
}
