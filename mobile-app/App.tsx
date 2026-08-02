import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen, DestinationStop } from './src/screens/HomeScreen';
import { ActiveTripScreen } from './src/screens/ActiveTripScreen';
import { AlarmService } from './src/services/alarm';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [activeDestination, setActiveDestination] = useState<DestinationStop | null>(null);

  useEffect(() => {
    (async () => {
      await AlarmService.init();
      try {
        const storedToken = await AsyncStorage.getItem('@wakestop_token');
        const storedUser = await AsyncStorage.getItem('@wakestop_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to restore session:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@wakestop_token');
    await AsyncStorage.removeItem('@wakestop_user');
    setToken(null);
    setUser(null);
    setActiveDestination(null);
  };

  const handleStartTrip = (destination: DestinationStop) => {
    setActiveDestination(destination);
  };

  const handleEndTrip = () => {
    setActiveDestination(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {!token ? (
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      ) : activeDestination ? (
        <ActiveTripScreen
          destination={activeDestination}
          token={token}
          onEndTrip={handleEndTrip}
        />
      ) : (
        <HomeScreen
          token={token}
          user={user}
          onStartTrip={handleStartTrip}
          onLogout={handleLogout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
