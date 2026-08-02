import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { DestinationStop } from './HomeScreen';
import { LocationService, TripLocationState } from '../services/location';
import { AlarmService } from '../services/alarm';
import { formatDistance } from '../utils/geo';

interface ActiveTripScreenProps {
  destination: DestinationStop;
  token: string;
  onEndTrip: () => void;
}

export const ActiveTripScreen: React.FC<ActiveTripScreenProps> = ({
  destination,
  token,
  onEndTrip,
}) => {
  const [tripState, setTripState] = useState<TripLocationState>({
    currentLocation: null,
    distanceMeters: 99999,
    eta: 'Calculating...',
    speedKmh: 0,
    stage: 'idle',
    isTracking: true,
  });

  const [isAlarmRinging, setIsAlarmRinging] = useState(false);

  useEffect(() => {
    LocationService.startTripTracking(destination, (updatedState) => {
      setTripState(updatedState);
      if (updatedState.stage === 'alarm' || updatedState.stage === 'critical') {
        setIsAlarmRinging(true);
      }
    });

    return () => {
      LocationService.stopTripTracking();
    };
  }, [destination]);

  const handleDismissAlarm = async () => {
    await AlarmService.stopAlarm();
    setIsAlarmRinging(false);
  };

  const handleStopTrip = async () => {
    await LocationService.stopTripTracking();
    onEndTrip();
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'notify':
        return '#f59e0b';
      case 'alarm':
        return '#ef4444';
      case 'critical':
      case 'arrived':
        return '#dc2626';
      default:
        return '#10b981';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>⚡ WAKESTOP ACTIVE TRACKING</Text>
        <View style={styles.liveBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveText}>GPS LIVE</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Destination Header */}
        <View style={styles.destinationCard}>
          <Text style={styles.destLabel}>Destination</Text>
          <Text style={styles.destName}>{destination.name}</Text>
        </View>

        {/* Distance Main Countdown Gauge */}
        <View style={styles.gaugeCard}>
          <Text style={styles.gaugeLabel}>Distance Remaining</Text>
          <Text style={styles.gaugeValue}>
            {formatDistance(tripState.distanceMeters)}
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Speed</Text>
              <Text style={styles.metricValue}>{tripState.speedKmh} km/h</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>ETA</Text>
              <Text style={styles.metricValue}>{tripState.eta}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Stage</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: getStageColor(tripState.stage), textTransform: 'uppercase' },
                ]}
              >
                {tripState.stage}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Indicators */}
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>🔒 Screen Wake Lock Active (Preventing Sleep)</Text>
          <Text style={styles.statusSub}>High-accuracy GPS location monitoring active in background</Text>
        </View>

        {/* Stop Trip Action */}
        <TouchableOpacity style={styles.stopButton} onPress={handleStopTrip}>
          <Text style={styles.stopButtonText}>🛑 Stop Trip & Cancel Alarm</Text>
        </TouchableOpacity>
      </View>

      {/* Alarm Fullscreen Alert Modal */}
      <Modal visible={isAlarmRinging} animationType="slide" transparent={false}>
        <View style={styles.alarmModalContainer}>
          <Text style={styles.alarmModalHeader}>🚨 WAKE UP!</Text>
          <Text style={styles.alarmModalSub}>Approaching Your Destination Stop</Text>

          <View style={styles.alarmDestCard}>
            <Text style={styles.alarmDestTitle}>{destination.name}</Text>
            <Text style={styles.alarmDistanceText}>
              Distance: {formatDistance(tripState.distanceMeters)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.dismissAlarmButton}
            onPress={handleDismissAlarm}
          >
            <Text style={styles.dismissAlarmText}>⏰ I AM AWAKE — DISMISS ALARM</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    fontSize: 14,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  liveText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  destinationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  destLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  destName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 4,
  },
  gaugeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  gaugeLabel: {
    fontSize: 14,
    color: '#818cf8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  gaugeValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f8fafc',
    marginVertical: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  statusBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  statusSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  stopButton: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal Alarm styles
  alarmModalContainer: {
    flex: 1,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alarmModalHeader: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  alarmModalSub: {
    fontSize: 18,
    color: '#fef2f2',
    marginTop: 8,
    fontWeight: '600',
  },
  alarmDestCard: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 24,
    marginVertical: 40,
    width: '100%',
    alignItems: 'center',
  },
  alarmDestTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  alarmDistanceText: {
    fontSize: 18,
    color: '#fca5a5',
    marginTop: 8,
    fontWeight: '700',
  },
  dismissAlarmButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
  },
  dismissAlarmText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '900',
  },
});
