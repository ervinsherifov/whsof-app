import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TRUCK_STATUSES } from '@/types';
import { EnhancedSearch } from '@/components/ui/enhanced-search';
import { useRecentSearches } from '@/components/ui/search-highlight';
import { CollapsibleFilters } from '@/components/ui/collapsible-filters';

interface TruckFiltersProps {
  searchTerm?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  onClearFilters: () => void;
}

export const TruckFilters: React.FC<TruckFiltersProps> = React.memo(({
  searchTerm,
  status,
  dateFrom,
  dateTo,
  onSearchChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters
}) => {
  const hasFilters = searchTerm || status || dateFrom || dateTo;
  const { recentSearches, addRecentSearch, setRecentSearches } = useRecentSearches('truckSearches');

  // Sample suggestions based on common truck-related searches
  const searchSuggestions = [
    'Pallets',
    'Electronics',
    'Food Products',
    'Textiles',
    'Machinery',
    'SCHEDULED',
    'ARRIVED',
    'IN_PROGRESS',
    'DONE'
  ];

  // Count active filters
  const activeFilterCount = [status, dateFrom, dateTo].filter(Boolean).length;

  // Filter sections for collapsible interface
  const filterSections = [
    {
      id: 'status',
      title: 'Status',
      hasActiveFilters: !!status,
      defaultOpen: true,
      content: (
        <input
          type="text"
          className="w-full px-2 py-1 text-sm"
          value={status || ''}
          onChange={e => onStatusChange(e.target.value)}
          placeholder="Status (e.g. Scheduled, Arrived, In Progress, Done)"
          aria-label="Status"
          maxLength={20}
        />
      )
    },
    {
      id: 'dates',
      title: 'Date Range',
      hasActiveFilters: !!(dateFrom || dateTo),
      defaultOpen: false,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            className="w-full px-2 py-1 text-sm"
            value={dateFrom ? format(dateFrom, 'dd/MM/yyyy') : ''}
            onChange={e => {
              const val = e.target.value;
              const parts = val.split('/');
              const date = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : undefined;
              onDateFromChange(val && date && !isNaN(date.getTime()) ? date : undefined);
            }}
            placeholder="Start Date (dd/mm/yyyy)"
            aria-label="Start Date"
            maxLength={10}
          />
          <input
            type="text"
            className="w-full px-2 py-1 text-sm"
            value={dateTo ? format(dateTo, 'dd/MM/yyyy') : ''}
            onChange={e => {
              const val = e.target.value;
              const parts = val.split('/');
              const date = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : undefined;
              onDateToChange(val && date && !isNaN(date.getTime()) ? date : undefined);
            }}
            placeholder="End Date (dd/mm/yyyy)"
            aria-label="End Date"
            maxLength={10}
          />
        </div>
      )
    }
  ];

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    if (value.trim()) {
      addRecentSearch(value);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Enhanced Search */}
      <div className="flex-1">
        <EnhancedSearch
          value={searchTerm || ''}
          onChange={handleSearchChange}
          placeholder="Search by license plate or cargo..."
          recentSearches={recentSearches}
          onRecentSearchesChange={setRecentSearches}
          className="w-full"
        />
      </div>

      {/* Collapsible Filters */}
      <CollapsibleFilters
        sections={filterSections}
        activeFilterCount={activeFilterCount}
        onClearAll={onClearFilters}
      />
    </div>
  );
});

TruckFilters.displayName = 'TruckFilters';