import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getHaversineDistance, calculateETA, evaluateAlarmStage, AlarmStage } from '../utils/geo';
import { AlarmService } from './alarm';

export interface TripLocationState {
  currentLocation: { latitude: number; longitude: number } | null;
  distanceMeters: number;
  eta: string;
  speedKmh: number;
  stage: AlarmStage;
  isTracking: boolean;
}

export type LocationUpdateCallback = (state: TripLocationState) => void;

class LocationTrackingManager {
  private subscription: Location.LocationSubscription | null = null;
  private targetDestination: { latitude: number; longitude: number; name: string } | null = null;
  private onUpdateCallback: LocationUpdateCallback | null = null;
  private isTracking: boolean = false;
  private lastStage: AlarmStage = 'idle';

  async requestPermissions(): Promise<boolean> {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      return false;
    }
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch (e) {
      console.log('Background location permission optional or deferred:', e);
    }
    return true;
  }

  async startTripTracking(
    destination: { latitude: number; longitude: number; name: string },
    onUpdate: LocationUpdateCallback
  ): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return false;

    this.targetDestination = destination;
    this.onUpdateCallback = onUpdate;
    this.isTracking = true;
    this.lastStage = 'idle';

    // Prevent phone screen from sleeping
    try {
      await activateKeepAwakeAsync();
    } catch (e) {}

    // Start high accuracy location stream
    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => this.handleLocationUpdate(location)
    );

    return true;
  }

  private handleLocationUpdate(location: Location.LocationObject) {
    if (!this.isTracking || !this.targetDestination) return;

    const currentCoords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    const distance = getHaversineDistance(currentCoords, this.targetDestination);
    const speedKmh = Math.max(0, Math.round((location.coords.speed || 0) * 3.6));
    const eta = calculateETA(distance, speedKmh > 10 ? speedKmh : 45);
    const stage = evaluateAlarmStage(distance);

    // Check stage transition to trigger alarm
    if (stage !== this.lastStage) {
      this.lastStage = stage;
      if (stage !== 'idle') {
        AlarmService.triggerStageAlarm(stage as any, this.targetDestination.name);
      }
    }

    const state: TripLocationState = {
      currentLocation: currentCoords,
      distanceMeters: distance,
      eta,
      speedKmh,
      stage,
      isTracking: this.isTracking,
    };

    if (this.onUpdateCallback) {
      this.onUpdateCallback(state);
    }
  }

  async stopTripTracking() {
    this.isTracking = false;
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    try {
      deactivateKeepAwake();
    } catch (e) {}
    await AlarmService.stopAlarm();
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }
}

export const LocationService = new LocationTrackingManager();
