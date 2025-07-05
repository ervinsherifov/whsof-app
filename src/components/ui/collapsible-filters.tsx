import * as React from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FilterSection {
  id: string;
  title: string;
  content: React.ReactNode;
  hasActiveFilters?: boolean;
  defaultOpen?: boolean;
}

interface CollapsibleFiltersProps {
  sections: FilterSection[];
  activeFilterCount?: number;
  onClearAll?: () => void;
  className?: string;
}

export const CollapsibleFilters: React.FC<CollapsibleFiltersProps> = ({
  sections,
  activeFilterCount = 0,
  onClearAll,
  className
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    sections.reduce((acc, section) => ({
      ...acc,
      [section.id]: section.defaultOpen ?? false
    }), {})
  );

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={cn("space-y-2 p-4 bg-muted/30 rounded-lg border animate-fade-in", className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 text-muted-foreground">🔍</div>
          <h3 className="font-medium text-sm">Filters</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        
        {hasActiveFilters && onClearAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Sections - always visible, no collapsible */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="font-semibold text-xs mb-1">{section.title}</div>
            <div>{section.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};