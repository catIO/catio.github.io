import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SettingsType, DEFAULT_SETTINGS } from "@/lib/timerService";
import { getSettings, saveSettings } from '@/lib/localStorage';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useNotification } from "@/hooks/useNotification";
import { useSettingsStore } from "@/stores/settingsStore";
import { playSound } from "@/lib/soundEffects";
import { SoundType } from "@/lib/soundEffects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestNotificationPermission } = useNotification();
  const { setSettings: updateGlobalSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<SettingsType>(getSettings() || DEFAULT_SETTINGS);
  const [isVolumeChanging, setIsVolumeChanging] = useState(false);
  const [isSoundTypeChanging, setIsSoundTypeChanging] = useState(false);

  // Handle settings update
  const handleSettingsUpdate = (newSettings: SettingsType) => {
    setLocalSettings(newSettings);
    saveSettings(newSettings);
    updateGlobalSettings(newSettings);
    
    // Update dark mode
    if (newSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    toast({
      title: "Settings Saved",
      description: "Your settings have been saved successfully.",
    });
  };

  // Handle volume change with preview sound
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    const newSettings = {
      ...localSettings,
      volume: newVolume
    };
    
    // Update settings
    setLocalSettings(newSettings);
    
    // Play preview sound if not already changing volume
    if (!isVolumeChanging) {
      setIsVolumeChanging(true);
      playSound('end', 1, newVolume, localSettings.soundType as SoundType)
        .then(() => {
          // Add a small delay before allowing another preview
          setTimeout(() => {
            setIsVolumeChanging(false);
          }, 500);
        })
        .catch(error => {
          console.error('Error playing preview sound:', error);
          setIsVolumeChanging(false);
        });
    }
  };

  // Save volume setting when slider interaction ends
  const handleVolumeChangeComplete = () => {
    saveSettings(localSettings);
    updateGlobalSettings(localSettings);
  };

  // Handle sound type change with preview
  const handleSoundTypeChange = (value: string) => {
    const newSoundType = value as SoundType;
    const newSettings = {
      ...localSettings,
      soundType: newSoundType
    };
    
    // Update settings
    setLocalSettings(newSettings);
    
    // Play preview sound if not already changing sound type
    if (!isSoundTypeChanging) {
      setIsSoundTypeChanging(true);
      playSound('end', 1, localSettings.volume, newSoundType)
        .then(() => {
          // Add a small delay before allowing another preview
          setTimeout(() => {
            setIsSoundTypeChanging(false);
          }, 500);
        })
        .catch(error => {
          console.error('Error playing preview sound:', error);
          setIsSoundTypeChanging(false);
        });
    }
  };

  // Save sound type setting when selection is made
  const handleSoundTypeChangeComplete = () => {
    saveSettings(localSettings);
    updateGlobalSettings(localSettings);
  };

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
      <div className="max-w-2xl mx-auto">
        <header className="p-4 bg-card shadow-sm flex items-center justify-between">
          <h1 className="text-2xl font-medium">Settings</h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            onClick={() => navigate("/")}
          >
            <span className="material-icons">close</span>
          </Button>
        </header>

        <section className="p-6">
          <div className="space-y-6">
            {/* Sound Settings */}
            <div>
              <h2 className="text-lg font-medium mb-4">Sound Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-muted-foreground mr-3">volume_up</span>
                    <Label htmlFor="volume-slider">Volume</Label>
                  </div>
                  <div className="w-48">
                    <Slider
                      id="volume-slider"
                      min={0}
                      max={100}
                      step={1}
                      value={[localSettings.volume || 50]}
                      onValueChange={handleVolumeChange}
                      onValueCommit={handleVolumeChangeComplete}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Quiet</span>
                      <span>Loud</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-muted-foreground mr-3">music_note</span>
                    <Label htmlFor="sound-type-select">Sound Type</Label>
                  </div>
                  <div className="w-48">
                    <Select
                      value={localSettings.soundType || 'beep'}
                      onValueChange={handleSoundTypeChange}
                      onOpenChange={(open) => {
                        if (!open) {
                          handleSoundTypeChangeComplete();
                        }
                      }}
                    >
                      <SelectTrigger id="sound-type-select">
                        <SelectValue placeholder="Select sound type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beep">Beep</SelectItem>
                        <SelectItem value="bell">Bell</SelectItem>
                        <SelectItem value="chime">Chime</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-muted-foreground mr-3">notifications</span>
                    <Label htmlFor="beeps-count">Number of Beeps</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        numberOfBeeps: Math.max(1, localSettings.numberOfBeeps - 1)
                      })}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{localSettings.numberOfBeeps}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        numberOfBeeps: Math.min(5, localSettings.numberOfBeeps + 1)
                      })}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Settings */}
            <div>
              <h2 className="text-lg font-medium mb-4">Timer Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-muted-foreground mr-3">timer</span>
                    <Label>Work Duration</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        workDuration: Math.max(5, localSettings.workDuration - 5)
                      })}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{localSettings.workDuration} min</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        workDuration: Math.min(60, localSettings.workDuration + 5)
                      })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-muted-foreground mr-3">coffee</span>
                    <Label>Break Duration</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        breakDuration: Math.max(1, localSettings.breakDuration - 1)
                      })}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{localSettings.breakDuration} min</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        breakDuration: Math.min(15, localSettings.breakDuration + 1)
                      })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-muted-foreground mr-3">repeat</span>
                    <Label>Number of Iterations</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        iterations: Math.max(1, localSettings.iterations - 1)
                      })}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{localSettings.iterations}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSettingsUpdate({
                        ...localSettings,
                        iterations: Math.min(8, localSettings.iterations + 1)
                      })}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Number of work-break cycles to complete before reset.
                </p>
              </div>
            </div>

            {/* Theme Settings */}
            <div>
              <h2 className="text-lg font-medium mb-4">Theme Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-muted-foreground mr-3">dark_mode</span>
                    <Label htmlFor="dark-mode-toggle">Dark Mode</Label>
                  </div>
                  <Switch
                    id="dark-mode-toggle"
                    checked={localSettings.darkMode}
                    onCheckedChange={(checked) => handleSettingsUpdate({
                      ...localSettings,
                      darkMode: checked
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 