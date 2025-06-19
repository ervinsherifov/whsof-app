import * as React from "react";
import { cn } from "@/lib/utils";

interface SearchHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  searchTerm,
  className,
  highlightClassName = "bg-yellow-200 dark:bg-yellow-900/50 font-medium rounded px-0.5"
}) => {
  if (!searchTerm || !text) {
    return <span className={className}>{text}</span>;
  }

  // Escape special regex characters
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Split text by search term (case insensitive)
  const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // If this part matches the search term (case insensitive), highlight it
        if (part.toLowerCase() === searchTerm.toLowerCase()) {
          return (
            <mark
              key={index}
              className={cn(highlightClassName, "animate-fade-in")}
            >
              {part}
            </mark>
          );
        }
        return part;
      })}
    </span>
  );
};

// Hook for managing recent searches
export const useRecentSearches = (key: string = 'recentSearches') => {
  const [recentSearches, setRecentSearches] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = React.useCallback((search: string) => {
    if (!search.trim()) return;
    
    setRecentSearches(prev => {
      const newSearches = [
        search,
        ...prev.filter(s => s !== search)
      ].slice(0, 10); // Keep only 10 recent searches
      
      try {
        localStorage.setItem(key, JSON.stringify(newSearches));
      } catch {
        // Handle localStorage errors silently
      }
      
      return newSearches;
    });
  }, [key]);

  const clearRecentSearches = React.useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(key);
    } catch {
      // Handle localStorage errors silently
    }
  }, [key]);

  return {
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    setRecentSearches
  };
};