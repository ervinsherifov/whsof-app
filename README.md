# DHL Sofia Warehouse Management System

A comprehensive warehouse management system built for DHL Sofia operations, featuring truck scheduling, task management, time tracking, and KPI monitoring.

## Features

- **Multi-role Access Control**: SUPER_ADMIN, OFFICE_ADMIN, WAREHOUSE_STAFF
- **Truck Management**: Complete lifecycle tracking from scheduling to completion
- **Task Management**: Assignment, tracking, and completion with photo documentation
- **Time Tracking**: Check-in/out system with overtime calculation
- **KPI Dashboard**: Real-time performance metrics and analytics
- **Mobile Responsive**: Works seamlessly on all devices

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Build Tool**: Vite
- **Deployment**: Production-ready with error monitoring

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or bun package manager

### Installation
```bash
git clone <repository-url>
cd warehouse-management-system
npm install
npm run dev
```

### Environment Setup
1. Create a Supabase project
2. Update database connection in `src/integrations/supabase/client.ts`
3. Run database migrations from `supabase/migrations/`
4. Configure authentication settings

## Deployment

### Web Deployment
```bash
npm run build
# Deploy the dist/ folder to your hosting provider
```

### Mobile App (Optional)
```bash
npm run build
npx cap sync
npx cap run android/ios
```

## System Architecture

### Database Schema
- **Users & Roles**: Profile management with role-based access
- **Trucks**: Complete truck lifecycle tracking
- **Tasks**: Task assignment and completion
- **Time Entries**: Work hour tracking with overtime
- **KPI Metrics**: Performance analytics and reporting

### Key Features
- Real-time updates across all connected clients
- Comprehensive audit trails for all operations
- Mobile-first responsive design
- Production-ready error monitoring
- Role-based data access controls

## Production Checklist

- [ ] Configure HTTPS/SSL certificate
- [ ] Update Supabase authentication URLs
- [ ] Set up error monitoring (Sentry)
- [ ] Configure database backups
- [ ] Test with production data volumes
- [ ] Set up monitoring alerts

## Support

For technical support and feature requests, contact the development team.