import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SettingsType, DEFAULT_SETTINGS } from "@/lib/timerService";
import { useDarkMode } from "@/lib/darkModeStore";
import { getQueryFn } from "@/lib/queryClient";
import { Toaster } from 'react-hot-toast';
import { useSettingsStore } from '@/stores/settingsStore';
import { API_BASE_URL } from '@/lib/queryClient';

function App() {
  // Fetch user settings from the server with staleTime: 0 to ensure fresh data
  const { data: settings, isLoading: isLoadingSettings } = useQuery<SettingsType>({
    queryKey: ['/settings'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Get the current settings with fallback to defaults
  const currentSettings: SettingsType = settings || DEFAULT_SETTINGS;
  const setIsDark = useDarkMode(state => state.setIsDark);
  
  // Initialize dark mode from settings
  useEffect(() => {
    setIsDark(currentSettings.darkMode);
  }, [currentSettings.darkMode, setIsDark]);

  // Set theme based on settings
  useEffect(() => {
    if (settings) {
      document.documentElement.classList.toggle('dark', settings.darkMode);
    }
  }, [settings?.darkMode]);

  // Subscribe to settings changes
  useEffect(() => {
    let previousSettings: SettingsType | null = null;
    
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      // Force a re-render when any query updates
      const newSettings = queryClient.getQueryData<SettingsType>(['/settings']);
      if (newSettings && JSON.stringify(newSettings) !== JSON.stringify(previousSettings)) {
        console.log('App - Settings cache updated:', newSettings);
        previousSettings = newSettings;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default App;
