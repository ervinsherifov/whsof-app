import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { EXCEPTION_STATUSES } from '@/types';
import { ExceptionWithTruck } from '@/hooks/useExceptionData';

interface ExceptionsSectionProps {
  exceptions: ExceptionWithTruck[];
  onStatusChange: (exception: ExceptionWithTruck, newStatus: string) => void;
  currentUser?: { id: string };
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT': return 'destructive';
    case 'HIGH': return 'secondary';
    case 'MEDIUM': return 'default';
    case 'LOW': return 'outline';
    default: return 'default';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'RESOLVED': return 'default';
    case 'IN_PROGRESS': return 'secondary';
    case 'ESCALATED': return 'destructive';
    default: return 'outline';
  }
};

export function ExceptionsSection({ exceptions, onStatusChange, currentUser }: ExceptionsSectionProps) {
  return (
    <Card className="card-professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Recent Exceptions
        </CardTitle>
        <CardDescription>Latest reported issues and delays</CardDescription>
      </CardHeader>
      <CardContent>
        {exceptions.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">No exceptions reported</p>
            <p className="text-sm">All operations running smoothly</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exceptions.map((exception: any) => (
              <div key={exception.id} className="card-professional p-4 space-y-3 hover:shadow-soft transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getPriorityColor(exception.priority)} className="font-medium">
                      {exception.priority}
                    </Badge>
                    <Badge variant={getStatusColor(exception.status)} className="font-medium">
                      {EXCEPTION_STATUSES[exception.status as keyof typeof EXCEPTION_STATUSES]}
                    </Badge>
                    <span className="font-semibold text-foreground">{exception.trucks.license_plate}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(exception.created_at), 'MMM dd, HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{exception.reason}</p>
                {exception.status === 'PENDING' && currentUser && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Select
                      value={exception.status}
                      onValueChange={(value) => onStatusChange(exception, value)}
                    >
                      <SelectTrigger className="w-[180px] form-professional">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border shadow-lg z-50">
                        {Object.entries(EXCEPTION_STATUSES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {String(label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}