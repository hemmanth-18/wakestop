import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { api } from '../services/api';

export interface DestinationStop {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
}

interface HomeScreenProps {
  token: string;
  user: any;
  onStartTrip: (destination: DestinationStop) => void;
  onLogout: () => void;
}

const PRESET_STOPS: DestinationStop[] = [
  { name: 'Salem New Bus Stand', latitude: 11.6643, longitude: 78.146 },
  { name: 'Chennai CMBT Koyambedu', latitude: 13.0694, longitude: 80.1948 },
  { name: 'Coimbatore Gandhipuram', latitude: 11.0168, longitude: 76.9558 },
  { name: 'Madurai Mattuthavani', latitude: 9.9452, longitude: 78.1565 },
  { name: 'Trichy Central Bus Stand', latitude: 10.7905, longitude: 78.6948 },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  token,
  user,
  onStartTrip,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DestinationStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<DestinationStop | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Nominatim forward geocoding
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`,
        { headers: { 'User-Agent': 'WakeStopMobile/1.0' } }
      );
      const data = await res.json();
      const mapped: DestinationStop[] = data.map((item: any) => ({
        id: item.place_id,
        name: item.display_name.split(',')[0],
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city: item.display_name,
      }));
      setSearchResults(mapped);
    } catch (e) {
      console.warn('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStop = (stop: DestinationStop) => {
    setSelectedStop(stop);
    setSearchQuery(stop.name);
    setSearchResults([]);
  };

  const handleConfirmStart = () => {
    if (!selectedStop) {
      Alert.alert('Select Destination', 'Please choose a destination stop to start tracking.');
      return;
    }
    onStartTrip(selectedStop);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>⚡ WAKESTOP</Text>
          <Text style={styles.greeting}>Hello, {user?.name || 'Commuter'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Where are you traveling to?</Text>

        <View style={styles.searchBoxContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search destination stop or city..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => item.id || index.toString()}
            style={styles.resultsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectStop(item)}
              >
                <Text style={styles.resultName}>📍 {item.name}</Text>
                <Text style={styles.resultDetails} numberOfLines={1}>
                  {item.city}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.presetContainer}>
            <Text style={styles.presetHeader}>Popular Transit Stops</Text>
            {PRESET_STOPS.map((stop, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip,
                  selectedStop?.name === stop.name && styles.presetChipSelected,
                ]}
                onPress={() => handleSelectStop(stop)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedStop?.name === stop.name && styles.presetTextSelected,
                  ]}
                >
                  📍 {stop.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedStop && (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedLabel}>Target Destination Selected:</Text>
            <Text style={styles.selectedTitle}>{selectedStop.name}</Text>
            <Text style={styles.selectedCoords}>
              Coordinates: {selectedStop.latitude.toFixed(4)}, {selectedStop.longitude.toFixed(4)}
            </Text>

            <TouchableOpacity style={styles.startButton} onPress={handleConfirmStart}>
              <Text style={styles.startButtonText}>🚀 Start GPS Tracking & Alarm</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 1.5,
  },
  greeting: {
    fontSize: 13,
    color: '#94a3b8',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  searchBoxContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultsList: {
    maxHeight: 220,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
  },
  resultDetails: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  presetContainer: {
    marginTop: 10,
  },
  presetHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  presetChip: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#312e81',
  },
  presetText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  presetTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  selectedCard: {
    marginTop: 'auto',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  selectedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 4,
  },
  selectedCoords: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
