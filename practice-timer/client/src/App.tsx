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
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    staleTime: 0,
    select: (data) => ({
      ...data,
      darkMode: data.darkMode ?? true // Default to dark mode if not set
    })
  });

  // Get the current settings with fallback to defaults
  const currentSettings: SettingsType = settings || DEFAULT_SETTINGS;
  const setIsDark = useDarkMode(state => state.setIsDark);
  const setSettings = useSettingsStore(state => state.setSettings);
  
  // Initialize settings store
  useEffect(() => {
    if (settings) {
      setSettings(settings);
    }
  }, [settings, setSettings]);

  // Initialize dark mode from settings
  useEffect(() => {
    if (settings) {
      setIsDark(settings.darkMode);
      document.documentElement.classList.toggle('dark', settings.darkMode);
    }
  }, [settings?.darkMode, setIsDark]);

  // Subscribe to settings changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      // Force a re-render when any query updates
      const newSettings = queryClient.getQueryData<SettingsType>(['/api/settings']);
      if (newSettings) {
        console.log('App - Settings cache updated:', newSettings);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Toaster />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default App;
