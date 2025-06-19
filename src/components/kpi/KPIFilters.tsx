import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { WarehouseUser } from '@/hooks/useUserKPIData';

interface KPIFiltersProps {
  selectedUserId: string;
  selectedPeriod: string;
  warehouseUsers: WarehouseUser[];
  onUserChange: (userId: string) => void;
  onPeriodChange: (period: string) => void;
}

export function KPIFilters({ 
  selectedUserId, 
  selectedPeriod, 
  warehouseUsers, 
  onUserChange, 
  onPeriodChange 
}: KPIFiltersProps) {
  return (
    <Card className="card-professional">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2 sm:mb-0 mb-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Filters:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 flex-1 sm:items-center">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Warehouse Staff</label>
              <Select value={selectedUserId} onValueChange={onUserChange}>
                <SelectTrigger className="w-[200px] bg-background border-border">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border shadow-lg z-50">
                  <SelectItem value="all">All Warehouse Staff</SelectItem>
                  {warehouseUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.display_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Time Period</label>
              <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-[150px] bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border shadow-lg z-50">
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}