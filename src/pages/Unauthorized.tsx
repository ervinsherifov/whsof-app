import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Unauthorized: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-destructive">
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Your role: <strong>{user?.role}</strong></p>
            <p>This page requires different permissions.</p>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="flex-1"
            >
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline"
              className="flex-1"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};