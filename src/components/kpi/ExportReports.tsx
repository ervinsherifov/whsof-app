import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ExportData {
  userKPIs: any[];
  kpiMetrics: any;
  trends: any[];
}

interface ExportReportsProps {
  data: ExportData;
}

export function ExportReports({ data }: ExportReportsProps) {
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'trends'>('summary');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportToExcel = (reportData: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KPI Report');
    
    // Add styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        if (row === 0) {
          // Header row styling
          ws[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'E2E8F0' } }
          };
        }
      }
    }
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToCSV = (reportData: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateSummaryReport = () => {
    const { userKPIs, kpiMetrics } = data;
    
    const summaryData = [
      {
        'Report Type': 'KPI Summary',
        'Generated Date': new Date().toISOString().split('T')[0],
        'Total Trucks': kpiMetrics?.total_trucks || 0,
        'Completed Trucks': kpiMetrics?.completed_trucks || 0,
        'In Progress Trucks': kpiMetrics?.in_progress_trucks || 0,
        'Avg Processing Hours': kpiMetrics?.avg_processing_hours?.toFixed(2) || '0.00',
        'Active Users': userKPIs.length,
      }
    ];

    return summaryData;
  };

  const generateDetailedReport = () => {
    const { userKPIs } = data;
    
    return userKPIs.map(user => ({
      'User Name': user.display_name || 'N/A',
      'Email': user.email,
      'Total Trucks Handled': user.total_trucks_handled || 0,
      'Completed Trucks': user.completed_trucks || 0,
      'Avg Processing Hours': user.avg_processing_hours?.toFixed(2) || '0.00',
      'Tasks Completed': user.tasks_completed || 0,
      'Total Pallets Handled': user.total_pallets_handled || 0,
      'Avg Pallets per Truck': user.avg_pallets_per_truck?.toFixed(2) || '0.00',
      'Unloading Speed (Pallets/Hour)': user.avg_unloading_speed_pallets_per_hour?.toFixed(2) || '0.00',
      'Date': user.metric_date || new Date().toISOString().split('T')[0],
    }));
  };

  const generateTrendsReport = () => {
    const { trends } = data;
    
    return trends.map(trend => ({
      'Date': trend.date,
      'Total Trucks': trend.total_trucks,
      'Completed Trucks': trend.completed_trucks,
      'Avg Processing Hours': trend.avg_processing_hours?.toFixed(2) || '0.00',
      'Total Pallets': trend.total_pallets,
      'Avg Efficiency': trend.avg_efficiency?.toFixed(2) || '0.00',
    }));
  };

  const handleExport = async () => {
    try {
      setLoading(true);

      let reportData: any[] = [];
      let filename = '';

      switch (reportType) {
        case 'summary':
          reportData = generateSummaryReport();
          filename = `kpi-summary-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'detailed':
          reportData = generateDetailedReport();
          filename = `kpi-detailed-${new Date().toISOString().split('T')[0]}`;
          break;
        case 'trends':
          reportData = generateTrendsReport();
          filename = `kpi-trends-${new Date().toISOString().split('T')[0]}`;
          break;
      }

      if (reportData.length === 0) {
        toast({
          title: 'No Data Available',
          description: 'There is no data to export for the selected report type.',
          variant: 'destructive',
        });
        return;
      }

      if (exportFormat === 'excel') {
        exportToExcel(reportData, filename);
      } else {
        exportToCSV(reportData, filename);
      }

      toast({
        title: 'Export Successful',
        description: `KPI report has been exported as ${exportFormat.toUpperCase()}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card-professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Export Reports
        </CardTitle>
        <CardDescription>Generate and download KPI reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Report Type</label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">KPI Summary</SelectItem>
                <SelectItem value="detailed">Detailed User Performance</SelectItem>
                <SelectItem value="trends">Historical Trends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Format</label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={loading}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {loading ? 'Exporting...' : `Export ${reportType} Report`}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Summary:</strong> Overall KPI metrics and totals</p>
          <p><strong>Detailed:</strong> Individual user performance data</p>
          <p><strong>Trends:</strong> Historical performance over time</p>
        </div>
      </CardContent>
    </Card>
  );
}