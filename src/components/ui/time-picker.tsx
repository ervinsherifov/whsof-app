import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  min?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = '',
  onChange,
  label,
  placeholder = 'HH:MM',
  required = false,
  disabled = false,
  className,
  id,
  min
}) => {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Ensure 24-hour format
    if (newValue && newValue.includes(':')) {
      const [hours, minutes] = newValue.split(':');
      const formattedHours = hours.padStart(2, '0');
      const formattedMinutes = minutes.padStart(2, '0');
      const formatted24Hour = `${formattedHours}:${formattedMinutes}`;
      
      onChange?.(formatted24Hour);
    } else {
      onChange?.(newValue);
    }
  };

  // Format value to ensure 24-hour display
  const formatValue = (val: string) => {
    if (!val) return '';
    
    // If value contains AM/PM, convert to 24-hour
    if (val.includes('AM') || val.includes('PM')) {
      const time = val.replace(/\s?(AM|PM)/i, '');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours, 10);
      
      if (val.toUpperCase().includes('PM') && hour24 !== 12) {
        hour24 += 12;
      } else if (val.toUpperCase().includes('AM') && hour24 === 12) {
        hour24 = 0;
      }
      
      return `${hour24.toString().padStart(2, '0')}:${minutes || '00'}`;
    }
    
    return val;
  };

  const displayValue = formatValue(value);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      )}
      <Input
        id={id}
        type="time"
        value={displayValue}
        onChange={handleTimeChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        className="w-full [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        // Force 24-hour format on all browsers
        style={{
          // Remove AM/PM on webkit browsers
          WebkitAppearance: 'none',
          MozAppearance: 'textfield'
        }}
      />
    </div>
  );
};