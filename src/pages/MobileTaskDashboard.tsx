import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

export const MobileTaskDashboard: React.FC = () => {
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Mobile Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Mobile task management interface coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};