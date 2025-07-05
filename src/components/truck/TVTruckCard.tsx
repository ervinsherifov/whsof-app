import React from 'react';
import { AlertTriangle, UserCircle } from 'lucide-react';

export function TVTruckCard({
  truck,
  isExpanded,
  onExpand,
  borderColor,
  hasException,
  StatusStepper,
  getFullName,
  calculateProgress,
  formatElapsedTime,
  getMinLeft,
  getEstimatedDoneTime,
  getPriorityColor,
}) {
  return (
    <div
      className={`relative rounded-xl p-3 lg:p-4 4xl:p-5 transform transition-all duration-700 ease-out animate-fade-in truck-card backdrop-blur-sm hover:scale-[1.01] shadow-lg cursor-pointer bg-background text-foreground border-2 ${borderColor}`}
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`Truck ${truck.license_plate} card`}
      onClick={onExpand}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onExpand(); }}
    >
      {/* Exception/Alert Icon */}
      {hasException && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold border border-red-700 shadow-red-500/50 animate-pulse z-20">
          <AlertTriangle className="w-4 h-4 mr-1" aria-label="Exception" />
          Exception
        </div>
      )}
      {/* Status Stepper */}
      <StatusStepper currentStatus={truck.status} />
      {/* Status Indicator - Top Left Corner Badge */}
      <div className={
        `absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider
        backdrop-blur-sm border shadow-sm
        ${truck.status === 'IN_PROGRESS' 
          ? 'bg-orange-500/90 text-white border-orange-400 shadow-orange-500/50 animate-pulse' 
          : truck.status === 'ARRIVED'
          ? 'bg-green-500/90 text-white border-green-400 shadow-green-500/50'
          : truck.status === 'SCHEDULED'
          ? 'bg-blue-500/90 text-white border-blue-400 shadow-blue-500/50'
          : 'bg-muted/90 text-muted-foreground border-muted'
        }`
      } style={{ animationDuration: truck.status === 'IN_PROGRESS' ? '3s' : undefined }}>
        {truck.status.replace('_', ' ')}
      </div>
      {/* Priority Indicator */}
      {truck.priority === 'URGENT' && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/90 text-destructive-foreground text-xs font-bold border border-destructive shadow-destructive/50">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          URGENT
        </div>
      )}
      {/* Header - License Plate - More Compact */}
      <div className="mt-6 mb-3 text-center">
        <div className="text-xl lg:text-2xl 4xl:text-3xl font-black tracking-tight text-foreground drop-shadow-sm">
          {truck.license_plate}
        </div>
      </div>
      {/* Main Info Grid - Ultra Compact */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Date</div>
          <div className="text-xs lg:text-sm 4xl:text-base font-bold text-foreground leading-tight">
            {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE' 
              ? (truck.actual_arrival_date 
                  ? new Date(truck.actual_arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                  : new Date(truck.arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                )
              : new Date(truck.arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
            }
          </div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Time</div>
          <div className="text-xs lg:text-sm 4xl:text-base font-black text-foreground font-mono leading-tight">
            {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE'
              ? (truck.actual_arrival_time 
                  ? (typeof truck.actual_arrival_time === 'string' && truck.actual_arrival_time.includes(':')
                      ? truck.actual_arrival_time.substring(0, 5)
                      : truck.arrival_time.substring(0, 5)
                    )
                  : truck.arrival_time.substring(0, 5)
                )
              : truck.arrival_time.substring(0, 5)
            }
          </div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Ramp</div>
          <div className="text-xs lg:text-sm 4xl:text-base font-bold text-foreground leading-tight">
            {truck.ramp_number ? `#${truck.ramp_number}` : 'TBD'}
          </div>
        </div>
        <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Pallets</div>
          <div className="text-xs lg:text-sm 4xl:text-base font-bold text-foreground leading-tight">
            {truck.pallet_count}
          </div>
        </div>
      </div>
      {/* Staff Avatars/Initials and Full Names */}
      <div className="flex gap-4 items-center mb-2">
        {truck.handled_by_name && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-xs" aria-label={`Handled by ${truck.handled_by_name}`}>
            <UserCircle className="w-4 h-4" />
            <span>{getFullName({ display_name: truck.handled_by_name })}</span>
          </div>
        )}
        {truck.created_by_profile && getFullName(truck.created_by_profile) && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-green-100 text-green-900 font-bold text-xs" aria-label={`Created by ${getFullName(truck.created_by_profile)}`}> 
            <UserCircle className="w-4 h-4" />
            <span>{getFullName(truck.created_by_profile)}</span>
          </div>
        )}
      </div>
      {/* Progress Indicator - Compact */}
      {truck.status === 'IN_PROGRESS' && (
        <div className="px-2 py-1.5 rounded bg-orange-500/10 border border-orange-400/30">
          <div className="flex justify-between text-xs text-orange-700 font-semibold mb-1">
            <span>🚛 Processing</span>
            <span>{formatElapsedTime(truck)}</span>
          </div>
          <div className="relative w-full bg-orange-200/50 rounded-full h-1.5 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${calculateProgress(truck)}%`
              }} 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent animate-slide-in-right" 
                 style={{ animationDuration: '2s', animationIterationCount: 'infinite' }} />
          </div>
          <div className="flex justify-between text-xs text-orange-600 mt-1">
            <span>{Math.round(calculateProgress(truck))}% done</span>
            <span>{getMinLeft(truck)}min left</span>
            {/* Estimated done time */}
            <span className="ml-2 text-green-700 font-bold">Est. done: {getEstimatedDoneTime(truck)}</span>
          </div>
        </div>
      )}
      {/* Expandable Details */}
      {isExpanded && (
        <div className="mt-3 p-3 rounded bg-background/80 border border-border/30 shadow-inner transition-all duration-300 divide-y divide-border">
          <div className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Cargo:</span> {truck.cargo_description}</div>
          {truck.late_arrival_reason && (
            <div className="mb-2 text-sm text-red-700"><span className="font-semibold">Late Reason:</span> {truck.late_arrival_reason}</div>
          )}
          {truck.exception_type && (
            <div className="mb-2 text-sm text-red-700"><span className="font-semibold">Exception:</span> {truck.exception_type}</div>
          )}
          {truck.notes && (
            <div className="mb-2 text-sm"><span className="font-semibold">Notes:</span> {truck.notes}</div>
          )}
        </div>
      )}
    </div>
  );
} 