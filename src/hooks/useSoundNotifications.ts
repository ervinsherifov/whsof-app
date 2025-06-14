import { useEffect, useRef } from 'react';

interface SoundNotificationOptions {
  enabled?: boolean;
  volume?: number;
}

interface TruckStatusChange {
  truckId: string;
  licensePlate: string;
  oldStatus?: string;
  newStatus: string;
}

export const useSoundNotifications = (options: SoundNotificationOptions = {}) => {
  const { enabled = true, volume = 0.7 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastStatusRef = useRef<Map<string, string>>(new Map());

  // Initialize audio context
  useEffect(() => {
    if (enabled && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log(`🔊 Audio context initialized, state: ${audioContextRef.current.state}`);
      } catch (error) {
        console.error('🔇 Failed to initialize audio context:', error);
      }
    }
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        console.log('🔇 Audio context closed');
      }
    };
  }, [enabled]);

  // Create different sound patterns for each status
  const playStatusSound = (status: string) => {
    console.log(`🔊 Attempting to play sound for status: ${status}, enabled: ${enabled}`);
    
    if (!enabled || !audioContextRef.current) {
      console.log(`🔇 Sound disabled or no audio context`);
      return;
    }

    const audioContext = audioContextRef.current;
    
    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      console.log(`🔊 Resuming suspended audio context`);
      audioContext.resume();
    }

    console.log(`🔊 Playing ${status} sound`);

    // Configure sound based on status
    switch (status) {
      case 'SCHEDULED':
        // Soft chime - two ascending notes
        playChime(audioContext, [440, 554.37], 0.3, 0.4); // A4 to C#5
        break;
      
      case 'ARRIVED':
        // Alert chime - three ascending notes
        playChime(audioContext, [523.25, 659.25, 783.99], 0.4, 0.3); // C5, E5, G5
        break;
      
      case 'IN_PROGRESS':
        // Work start - confident double beep
        playBeepSequence(audioContext, [698.46, 698.46], 0.5, 0.2, 0.1); // F5
        break;
      
      case 'DONE':
        // Completion - triumphant ascending sequence
        playChime(audioContext, [523.25, 659.25, 783.99, 1046.50], 0.6, 0.25); // C5, E5, G5, C6
        break;
      
      default:
        // Generic notification
        playBeepSequence(audioContext, [440], 0.3, 0.2);
        break;
    }
  };

  const playChime = (
    audioContext: AudioContext, 
    frequencies: number[], 
    maxVolume: number, 
    noteDuration: number
  ) => {
    console.log(`🔊 Playing chime with frequencies: ${frequencies.join(', ')}`);
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          oscillator.type = 'sine';
          
          // Smooth volume envelope
          const now = audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(maxVolume * volume, now + 0.05);
          gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);
          
          oscillator.start(now);
          oscillator.stop(now + noteDuration);
          
          console.log(`🔊 Chime note ${index + 1} played: ${freq}Hz`);
        } catch (error) {
          console.error(`🔇 Error playing chime note ${index + 1}:`, error);
        }
      }, index * (noteDuration * 800)); // Convert to milliseconds
    });
  };

  const playBeepSequence = (
    audioContext: AudioContext,
    frequencies: number[],
    maxVolume: number,
    beepDuration: number,
    gap: number = 0.1
  ) => {
    console.log(`🔊 Playing beep sequence with frequencies: ${frequencies.join(', ')}`);
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          oscillator.type = 'square';
          
          const now = audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(maxVolume * volume, now + 0.01);
          gainNode.gain.linearRampToValueAtTime(0, now + beepDuration);
          
          oscillator.start(now);
          oscillator.stop(now + beepDuration);
          
          console.log(`🔊 Beep ${index + 1} played: ${freq}Hz`);
        } catch (error) {
          console.error(`🔇 Error playing beep ${index + 1}:`, error);
        }
      }, index * (beepDuration + gap) * 1000);
    });
  };

  const handleTruckStatusChange = (trucks: any[]) => {
    if (!enabled) return;

    trucks.forEach((truck) => {
      const lastStatus = lastStatusRef.current.get(truck.id);
      
      if (lastStatus && lastStatus !== truck.status) {
        // Status changed - play notification
        console.log(`🔊 Truck ${truck.license_plate}: ${lastStatus} → ${truck.status}`);
        playStatusSound(truck.status);
      } else if (!lastStatus) {
        // New truck (first time seeing it) - play SCHEDULED sound
        console.log(`🔊 New truck scheduled: ${truck.license_plate} (${truck.status})`);
        playStatusSound(truck.status);
      }
      
      // Update the status tracking
      lastStatusRef.current.set(truck.id, truck.status);
    });

    // Clean up trucks that are no longer in the list
    const currentTruckIds = new Set(trucks.map(t => t.id));
    for (const [truckId] of lastStatusRef.current) {
      if (!currentTruckIds.has(truckId)) {
        lastStatusRef.current.delete(truckId);
      }
    }
  };

  const playTestSound = (status: string) => {
    console.log(`🔊 Test sound requested for: ${status}`);
    playStatusSound(status);
  };

  const initializeAudio = async () => {
    console.log('🔊 Manual audio initialization requested');
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log(`🔊 Audio context created manually, state: ${audioContextRef.current.state}`);
      } catch (error) {
        console.error('🔇 Failed to create audio context manually:', error);
        return;
      }
    }
    
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('🔊 Audio context resumed successfully');
      } catch (error) {
        console.error('🔇 Failed to resume audio context:', error);
      }
    }
  };

  return {
    handleTruckStatusChange,
    playTestSound,
    initializeAudio,
    enabled
  };
};