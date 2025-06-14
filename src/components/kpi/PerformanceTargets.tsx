import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Target, Plus, Trash2 } from 'lucide-react';

interface PerformanceTarget {
  id: string;
  metric_name: string;
  target_value: number;
  period_type: string;
  current_value?: number;
  achievement_percentage?: number;
}

interface PerformanceTargetsProps {
  userKPIs: any[];
}

export function PerformanceTargets({ userKPIs }: PerformanceTargetsProps) {
  const [targets, setTargets] = useState<PerformanceTarget[]>([]);
  const [newTarget, setNewTarget] = useState({
    metric_name: '',
    target_value: '',
    period_type: 'DAILY'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const metricOptions = [
    { value: 'total_trucks_handled', label: 'Total Trucks Handled' },
    { value: 'completed_trucks', label: 'Completed Trucks' },
    { value: 'avg_processing_hours', label: 'Avg Processing Hours' },
    { value: 'total_pallets_handled', label: 'Total Pallets Handled' },
    { value: 'avg_unloading_speed_pallets_per_hour', label: 'Unloading Speed (Pallets/Hour)' },
  ];

  const fetchTargets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('performance_targets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      toast({
        title: 'Error fetching targets',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Calculate current values and achievement percentages
    const targetsWithProgress = data.map(target => {
      const currentKPI = userKPIs.find(kpi => kpi.user_id === user.id);
      const currentValue = currentKPI ? currentKPI[target.metric_name] || 0 : 0;
      const achievementPercentage = target.target_value > 0 
        ? Math.min((currentValue / target.target_value) * 100, 100)
        : 0;

      return {
        ...target,
        current_value: currentValue,
        achievement_percentage: achievementPercentage
      };
    });

    setTargets(targetsWithProgress);
  };

  const addTarget = async () => {
    if (!user || !newTarget.metric_name || !newTarget.target_value) return;

    const { error } = await supabase
      .from('performance_targets')
      .insert({
        user_id: user.id,
        metric_name: newTarget.metric_name,
        target_value: parseFloat(newTarget.target_value),
        period_type: newTarget.period_type
      });

    if (error) {
      toast({
        title: 'Error adding target',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Target Added',
      description: 'Performance target has been set successfully.',
    });

    setNewTarget({ metric_name: '', target_value: '', period_type: 'DAILY' });
    setShowAddForm(false);
    fetchTargets();
  };

  const deleteTarget = async (targetId: string) => {
    const { error } = await supabase
      .from('performance_targets')
      .update({ is_active: false })
      .eq('id', targetId);

    if (error) {
      toast({
        title: 'Error deleting target',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Target Removed',
      description: 'Performance target has been removed.',
    });

    fetchTargets();
  };

  useEffect(() => {
    fetchTargets();
  }, [user, userKPIs]);

  const getMetricLabel = (metricName: string) => {
    const option = metricOptions.find(opt => opt.value === metricName);
    return option ? option.label : metricName;
  };

  return (
    <Card className="card-professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Performance Targets
            </CardTitle>
            <CardDescription>Set and track your performance goals</CardDescription>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Target
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showAddForm && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-accent/5 rounded-lg border border-border">
            <Select value={newTarget.metric_name} onValueChange={(value) => setNewTarget({...newTarget, metric_name: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {metricOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              placeholder="Target value"
              value={newTarget.target_value}
              onChange={(e) => setNewTarget({...newTarget, target_value: e.target.value})}
            />
            
            <Select value={newTarget.period_type} onValueChange={(value) => setNewTarget({...newTarget, period_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={addTarget} disabled={!newTarget.metric_name || !newTarget.target_value}>
              Add Target
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {targets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted" />
              <p>No performance targets set</p>
              <p className="text-sm">Add targets to track your progress</p>
            </div>
          ) : (
            targets.map((target) => (
              <div key={target.id} className="flex items-center justify-between p-4 bg-accent/5 rounded-lg border border-border">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">
                      {getMetricLabel(target.metric_name)}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {target.period_type.toLowerCase()}
                      </Badge>
                      <Button
                        onClick={() => deleteTarget(target.id)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {target.current_value?.toFixed(1) || 0} / {target.target_value} 
                      </span>
                      <span className="font-medium text-primary">
                        {target.achievement_percentage?.toFixed(0) || 0}%
                      </span>
                    </div>
                    <Progress 
                      value={target.achievement_percentage || 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}