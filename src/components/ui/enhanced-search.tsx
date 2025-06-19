import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface EnhancedSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  recentSearches?: string[];
  onRecentSearchesChange?: (searches: string[]) => void;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  suggestions = [],
  className,
  recentSearches = [],
  onRecentSearchesChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on current input
  const filteredSuggestions = suggestions.filter(
    suggestion => 
      suggestion.toLowerCase().includes(value.toLowerCase()) && 
      suggestion.toLowerCase() !== value.toLowerCase()
  ).slice(0, 5);

  // Filter recent searches (exclude current value and limit to 5)
  const filteredRecentSearches = recentSearches
    .filter(search => 
      search.toLowerCase() !== value.toLowerCase() &&
      search.toLowerCase().includes(value.toLowerCase())
    )
    .slice(0, 5);

  const hasItems = filteredSuggestions.length > 0 || filteredRecentSearches.length > 0;

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    
    // Add to recent searches
    if (onRecentSearchesChange && selectedValue.trim()) {
      const updatedRecent = [
        selectedValue,
        ...recentSearches.filter(search => search !== selectedValue)
      ].slice(0, 10); // Keep only 10 recent searches
      onRecentSearchesChange(updatedRecent);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(e.target.value.length > 0 && hasItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      handleSelect(value);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeRecentSearch = (searchToRemove: string) => {
    if (onRecentSearchesChange) {
      onRecentSearchesChange(recentSearches.filter(search => search !== searchToRemove));
    }
  };

  useEffect(() => {
    setIsOpen(inputFocused && value.length > 0 && hasItems);
  }, [inputFocused, value, hasItems]);

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 200)}
              placeholder={placeholder}
              className="pl-10 pr-10"
              aria-label="Enhanced search"
            />
            {value && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted-foreground/20"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full p-0 shadow-lg border-muted" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command className="max-h-64">
            <CommandList>
              {!hasItems && (
                <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                  No suggestions available
                </CommandEmpty>
              )}
              
              {filteredRecentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches" className="border-b">
                  {filteredRecentSearches.map((search, index) => (
                    <CommandItem
                      key={`recent-${index}`}
                      onSelect={() => handleSelect(search)}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center">
                        <div className="h-3 w-3 mr-2 text-muted-foreground">🕒</div>
                        <span className="text-sm">{search}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(search);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {filteredSuggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {filteredSuggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`suggestion-${index}`}
                      onSelect={() => handleSelect(suggestion)}
                      className="text-sm"
                    >
                      <Search className="h-3 w-3 mr-2 text-muted-foreground" />
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};