import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, Book } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SystemManual: React.FC = () => {
  const { toast } = useToast();

  const downloadPDF = async () => {
    try {
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF();
      
      // Set font to support Bulgarian characters
      pdf.setFont("helvetica");
      
      // Title page
      pdf.setFontSize(20);
      pdf.text('DHL SOF-WH System Manual', 20, 30);
      pdf.setFontSize(16);
      pdf.text('Warehouse Management System', 20, 45);
      pdf.setFontSize(12);
      pdf.text('Generated: ' + new Date().toLocaleDateString(), 20, 60);
      
      // Add content sections
      const sections = [
        { title: 'User Roles / Потребителски роли', content: [
          'WAREHOUSE_STAFF - Складови работници',
          '• Dashboard (/dashboard)',
          '• Time Tracking (/time-tracking)', 
          '• Truck Scheduling (/trucks)',
          '• Mobile App (/mobile-app)',
          '• Task Management (/tasks)',
          '• TV Dashboard (/tv-dashboard)',
          '',
          'OFFICE_ADMIN - Офис администратори', 
          '• All WAREHOUSE_STAFF pages',
          '• KPI Dashboard (/kpi-dashboard)',
          '• Reports (/reports)',
          '',
          'SUPER_ADMIN - Супер администратори',
          '• All previous pages', 
          '• User Management (/users)',
          '• Overtime Approval (/overtime-approval)'
        ]},
        { title: 'Main Pages / Основни страници', content: [
          'Dashboard (/dashboard) - Обобщена информация',
          'Time Tracking (/time-tracking) - Проследяване на време',
          'Truck Scheduling (/trucks) - График на камиони',
          'Mobile App (/mobile-app) - Мобилно приложение',
          'Task Management (/tasks) - Управление на задачи',
          'KPI Dashboard (/kpi-dashboard) - КПИ метрики',
          'Reports (/reports) - Отчети',
          'TV Dashboard (/tv-dashboard) - Телевизионен дисплей',
          'User Management (/users) - Управление на потребители',
          'Overtime Approval (/overtime-approval) - Одобряване на извънредни часове'
        ]},
        { title: 'Truck Statuses / Статуси на камиони', content: [
          'SCHEDULED - Планиран',
          'ARRIVED - Пристигнал', 
          'IN_PROGRESS - В процес на обработка',
          'DONE - Завършен'
        ]},
        { title: 'Mobile Features / Мобилни функции', content: [
          'Check In/Check Out - Отбелязване на работно време',
          'Truck Management - Управление на камиони',
          'Helper Selection - Избор на помощник (опционално)',
          'Photo Upload - Качване на снимки',
          'Task Completion - Завършване на задачи'
        ]},
        { title: 'Reports Features / Функции на отчетите', content: [
          'Multiple handlers - Множество работници на камион',
          'Pallet allocation - Разпределение на палети',
          'Performance tracking - Проследяване на производителност',
          'Excel export - Експорт в Excel',
          'Date filtering - Филтриране по дата'
        ]}
      ];
      
      let yPosition = 80;
      
      sections.forEach((section, index) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(section.title, 20, yPosition);
        yPosition += 10;
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        
        section.content.forEach(line => {
          if (yPosition > 280) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, 25, yPosition);
          yPosition += 6;
        });
        
        yPosition += 10;
      });
      
      // Add troubleshooting section
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text('Troubleshooting / Решаване на проблеми', 20, yPosition);
      yPosition += 15;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      
      const troubleshooting = [
        'Login issues / Проблеми с влизането:',
        '• Check internet connection / Проверете интернет връзката',
        '• Verify credentials / Проверете данните за вход',
        '• Refresh page / Обновете страницата',
        '',
        'Mobile app issues / Проблеми с мобилното приложение:',
        '• Refresh page / Обновете страницата', 
        '• Check internet connection / Проверете връзката',
        '• Try different browser / Опитайте с друг браузър',
        '',
        'Support contacts / Контакти за поддръжка:',
        '• IT Support: it-support@dhl.com',
        '• System Admin: system-admin@dhl.com'
      ];
      
      troubleshooting.forEach(line => {
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, 25, yPosition);
        yPosition += 6;
      });
      
      // Save the PDF
      pdf.save('DHL-SOF-WH-System-Manual.pdf');
      
      toast({
        title: "Manual Downloaded",
        description: "System manual has been downloaded as PDF",
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed", 
        description: "Failed to generate PDF manual",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Book className="h-6 w-6" />
            <div>
              <CardTitle>System Manual / Системно ръководство</CardTitle>
              <CardDescription>
                DHL SOF-WH Warehouse Management System Manual
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <div>
                <h3 className="font-medium">PDF Manual</h3>
                <p className="text-sm text-muted-foreground">
                  Complete system manual in Bulgarian with English technical references
                </p>
              </div>
            </div>
            <Button onClick={downloadPDF} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manual Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <ul className="space-y-2 text-sm">
                    <li>• Въведение (Introduction)</li>
                    <li>• Влизане в системата (Login)</li>
                    <li>• Потребителски роли (User Roles)</li>
                    <li>• Основни страници (Main Pages)</li>
                    <li>• Мобилно приложение (Mobile App)</li>
                    <li>• Отчети и КПИ (Reports & KPI)</li>
                    <li>• Административни функции (Admin Functions)</li>
                    <li>• Технически детайли (Technical Details)</li>
                    <li>• Често срещани проблеми (Troubleshooting)</li>
                    <li>• Контакти за поддръжка (Support Contacts)</li>
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <ul className="space-y-2 text-sm">
                    <li>• Bulgarian language with English technical terms</li>
                    <li>• Complete page references (/dashboard, /trucks, etc.)</li>
                    <li>• Role-based access documentation</li>
                    <li>• Step-by-step instructions</li>
                    <li>• Troubleshooting guide</li>
                    <li>• Mobile app documentation</li>
                    <li>• KPI and reports explanation</li>
                    <li>• Contact information</li>
                    <li>• System requirements</li>
                    <li>• Version information</li>
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
            <h4 className="font-medium mb-2">Note / Забележка</h4>
            <p className="text-sm text-muted-foreground">
              The manual uses Bulgarian for user instructions and explanations, 
              while keeping English terms for technical elements (URLs, statuses, roles) 
              for easy reference by IT staff.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Ръководството използва български език за потребителските инструкции, 
              като запазва английските термини за техническите елементи за лесно ориентиране от IT персонала.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};