import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { api, type Stop } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { SearchIcon, MapPinIcon, BusIcon, NavigationIcon, CheckIcon, SlidersIcon } from "../components/Icons";

// Custom Leaflet SVG marker for map picker
const customPickerIcon = new L.DivIcon({
  html: `<div style="background:#00F0FF;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 25px #00F0FF;border:3px solid #050811" class="animate-bounce"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050811" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function SelectDestination() {
  const { token } = useAuth();
  const nav = useNavigate();

  const [mode, setMode] = useState<"map" | "coordinates" | "stops">("map");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Stop[]>([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [selected, setSelected] = useState<Stop | null>(null);

  // Custom Map Picker state
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [customName, setCustomName] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Lat/Lng Manual Input state
  const [inputLat, setInputLat] = useState("");
  const [inputLng, setInputLng] = useState("");

  // Map view & location search state
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.0168, 76.9558]); // Default Coimbatore area
  const [mapZoom, setMapZoom] = useState(10);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<NominatimResult[]>([]);
  const [isMapSearching, setIsMapSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.allStops().then(setAllStops).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(allStops);
      return;
    }
    const handle = setTimeout(() => {
      api.searchStops(query).then(setResults).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [query, allStops]);

  // Live autocomplete suggestions for map location search
  useEffect(() => {
    if (!mapSearchQuery.trim() || mapSearchQuery.trim().length < 3) {
      setMapSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsMapSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            mapSearchQuery.trim()
          )}&limit=5`
        );
        if (res.ok) {
          const data: NominatimResult[] = await res.json();
          setMapSearchResults(data);
        }
      } catch {
        // ignore network error
      } finally {
        setIsMapSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [mapSearchQuery]);

  const selectSearchResult = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const parts = item.display_name.split(",");
    const shortName = parts.slice(0, 2).join(",").trim() || item.display_name;

    setMapCenter([lat, lng]);
    setMapZoom(14);
    setMapPin({ lat, lng });
    setInputLat(lat.toString());
    setInputLng(lng.toString());
    setCustomName(shortName);
    setSelected(null);
    setMapSearchResults([]);
    setStatusMessage(`Zoomed map to "${shortName}". Tap on map to adjust pin.`);
  };

  const handleMapSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchQuery.trim()) return;

    if (mapSearchResults.length > 0) {
      selectSearchResult(mapSearchResults[0]);
      return;
    }

    setIsMapSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          mapSearchQuery.trim()
        )}&limit=5`
      );
      if (res.ok) {
        const data: NominatimResult[] = await res.json();
        if (data.length > 0) {
          selectSearchResult(data[0]);
        } else {
          setError(`No location found for "${mapSearchQuery}".`);
        }
      }
    } catch {
      setError("Location search failed. Please check connection.");
    } finally {
      setIsMapSearching(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setMapPin({ lat, lng });
    setInputLat(lat.toFixed(5));
    setInputLng(lng.toFixed(5));
    setSelected(null);
    setGeocoding(true);
    setStatusMessage(null);
    setCustomName(`Pin Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(",");
          const name = parts.slice(0, 2).join(",").trim();
          setCustomName(name || `Map Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      }
    } catch {
      // fallback coordinates
    } finally {
      setGeocoding(false);
    }
  };

  // Set pin using explicit Latitude and Longitude
  const handleApplyCoordinates = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Please enter valid latitude (-90 to 90) and longitude (-180 to 180).");
      return;
    }

    setError(null);
    setMapCenter([lat, lng]);
    setMapZoom(15);
    handleMapClick(lat, lng);
    setStatusMessage(`Located pin at Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
  };

  async function startTrip() {
    if (!token) return;

    let destLat: number;
    let destLng: number;
    let destName: string;

    if (mode === "stops" && selected) {
      destLat = selected.latitude;
      destLng = selected.longitude;
      destName = selected.name;
    } else if ((mode === "map" || mode === "coordinates") && mapPin) {
      destLat = mapPin.lat;
      destLng = mapPin.lng;
      destName = customName.trim() || `Map Location (${mapPin.lat.toFixed(4)}, ${mapPin.lng.toFixed(4)})`;
    } else {
      return;
    }

    setStarting(true);
    setError(null);
    try {
      let startLat: number | undefined;
      let startLng: number | undefined;
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              startLat = pos.coords.latitude;
              startLng = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      }
      const trip = await api.startTrip(token, {
        destinationName: destName,
        destinationLat: destLat,
        destinationLng: destLng,
        startLat,
        startLng,
      });
      nav(`/tracking/${trip.id}`, { state: { trip } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the trip");
    } finally {
      setStarting(false);
    }
  }

  const isReadyToStart = (mode === "stops" && selected) || ((mode === "map" || mode === "coordinates") && mapPin);

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-8">
      <ThunderNeonCanvas />

      <div className="relative z-10 mx-auto max-w-xl">
        <div className="glass-panel-gold rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-cyan/20 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <NavigationIcon size={26} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Set Destination
              </h1>
              <p className="mt-0.5 text-xs text-night-500 sm:text-sm">
                Search place on map, enter Lat/Lng, or pick a corridor stop.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-6 flex rounded-xl bg-night-950/80 p-1.5 border border-night-700">
            <button
              onClick={() => setMode("map")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
                mode === "map"
                  ? "bg-neon-cyan text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                  : "text-night-500 hover:text-white"
              }`}
            >
              <MapPinIcon size={16} />
              Pick on Map
            </button>
            <button
              onClick={() => setMode("coordinates")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
                mode === "coordinates"
                  ? "bg-neon-purple text-white shadow-[0_0_15px_rgba(176,38,255,0.4)]"
                  : "text-night-500 hover:text-white"
              }`}
            >
              <SlidersIcon size={16} />
              Lat / Lng
            </button>
            <button
              onClick={() => setMode("stops")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-all ${
                mode === "stops"
                  ? "bg-neon-gold text-night-950 shadow-[0_0_15px_rgba(255,184,0,0.4)]"
                  : "text-night-500 hover:text-white"
              }`}
            >
              <BusIcon size={16} />
              Stops
            </button>
          </div>

          {/* Mode 1: Search on Map & Interactive Pin */}
          {mode === "map" && (
            <div className="mt-6 space-y-4">
              {/* Note for Search on Map */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neon-cyan flex items-center gap-1.5">
                  <SearchIcon size={14} /> Search Location on Map:
                </label>
                <span className="text-[11px] font-semibold text-night-500">Auto-zoom & Pin</span>
              </div>

              {/* Location Search Bar */}
              <div className="relative z-30">
                <form onSubmit={handleMapSearchSubmit} className="relative flex items-center">
                  <SearchIcon className="absolute left-3.5 text-neon-cyan" size={18} />
                  <input
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    placeholder="Search place (e.g. Karumathampatti, Sulur)..."
                    className="w-full rounded-xl border border-neon-cyan/50 bg-night-950/95 pl-10 pr-24 py-3.5 text-sm text-white placeholder-night-500 outline-none focus:border-neon-cyan focus:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 rounded-lg bg-neon-cyan px-3.5 py-2 text-xs font-extrabold text-night-950 shadow-[0_0_10px_#00F0FF] hover:brightness-110 active:scale-95 transition-all"
                  >
                    {isMapSearching ? "Searching…" : "Search"}
                  </button>
                </form>

                {/* Autocomplete Suggestions Dropdown */}
                {mapSearchResults.length > 0 && (
                  <ul className="absolute z-50 mt-1.5 w-full max-h-52 overflow-y-auto rounded-xl border border-neon-cyan/60 bg-night-950 shadow-[0_12px_35px_rgba(0,0,0,0.9)] divide-y divide-night-800">
                    {mapSearchResults.map((item) => (
                      <li key={item.place_id}>
                        <button
                          type="button"
                          onClick={() => selectSearchResult(item)}
                          className="w-full px-4 py-3 text-left text-xs text-night-200 hover:bg-neon-cyan/20 hover:text-neon-cyan transition-colors flex items-center gap-2.5"
                        >
                          <MapPinIcon size={16} className="text-neon-cyan shrink-0" />
                          <span className="truncate font-medium">{item.display_name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Status Hint */}
              {statusMessage ? (
                <div className="rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 p-3 text-xs text-neon-cyan font-medium flex items-center justify-between">
                  <span>📍 {statusMessage}</span>
                </div>
              ) : (
                <p className="text-xs text-neon-cyan font-semibold flex items-center gap-1.5">
                  <MapPinIcon size={14} /> Tap anywhere on map below to set or adjust destination pin:
                </p>
              )}

              {/* Map View */}
              <div className="h-72 overflow-hidden rounded-2xl border border-neon-cyan/50 shadow-[0_0_25px_rgba(0,240,255,0.2)] relative z-10">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <MapController center={mapCenter} zoom={mapZoom} />
                  <MapClickHandler onSelect={handleMapClick} />
                  {mapPin && (
                    <Marker position={[mapPin.lat, mapPin.lng]} icon={customPickerIcon}>
                      <Popup className="font-sans text-xs font-semibold">
                        {customName || "Selected Destination Pin"}
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* Selected Pin Details */}
              {mapPin && (
                <div className="rounded-2xl border border-neon-cyan/40 bg-night-900/90 p-4 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                  <label className="text-xs font-bold text-neon-cyan uppercase tracking-wider">
                    Destination Name
                  </label>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter location title"
                    className="mt-1.5 w-full rounded-xl border border-night-700 bg-night-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-neon-cyan"
                  />
                  <div className="mt-2.5 flex items-center justify-between font-mono text-xs text-night-400">
                    <span>
                      Lat: {mapPin.lat.toFixed(5)}, Lng: {mapPin.lng.toFixed(5)}
                    </span>
                    {geocoding && <span className="text-neon-cyan animate-pulse">Resolving name…</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Manual Latitude & Longitude Coordinates */}
          {mode === "coordinates" && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-neon-purple/40 bg-night-900/90 p-5 space-y-4">
                <h3 className="text-sm font-bold text-neon-purple uppercase tracking-wider flex items-center gap-2">
                  <SlidersIcon size={16} /> Enter Exact Coordinates (Lat & Lng)
                </h3>
                <p className="text-xs text-night-400">
                  Enter exact GPS coordinates to pin your destination precisely.
                </p>

                <form onSubmit={handleApplyCoordinates} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-white">Latitude (e.g. 11.0183)</label>
                      <input
                        type="number"
                        step="any"
                        value={inputLat}
                        onChange={(e) => setInputLat(e.target.value)}
                        placeholder="11.0183"
                        className="mt-1.5 w-full rounded-xl border border-night-700 bg-night-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-neon-purple"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-white">Longitude (e.g. 76.9725)</label>
                      <input
                        type="number"
                        step="any"
                        value={inputLng}
                        onChange={(e) => setInputLng(e.target.value)}
                        placeholder="76.9725"
                        className="mt-1.5 w-full rounded-xl border border-night-700 bg-night-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-neon-purple"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-neon-purple py-3 font-display text-sm font-bold text-white shadow-[0_0_15px_rgba(176,38,255,0.4)] hover:brightness-110 transition-all"
                  >
                    Locate on Map & Place Pin
                  </button>
                </form>
              </div>

              {/* Map Preview for Coordinates */}
              <div className="h-64 overflow-hidden rounded-2xl border border-neon-purple/40 shadow-[0_0_20px_rgba(176,38,255,0.15)] relative">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <MapController center={mapCenter} zoom={mapZoom} />
                  <MapClickHandler onSelect={handleMapClick} />
                  {mapPin && (
                    <Marker position={[mapPin.lat, mapPin.lng]} icon={customPickerIcon}>
                      <Popup className="font-sans text-xs font-semibold">
                        {customName || "Coordinate Pin Target"}
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>
          )}

          {/* Mode 3: Bus Corridor Search */}
          {mode === "stops" && (
            <div className="mt-6">
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-3.5 text-night-500" size={18} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a bus stop, e.g. Salem, Chennai"
                  className="w-full rounded-xl border border-night-700 bg-night-900/90 pl-10 pr-4 py-3 text-sm text-white placeholder-night-500 outline-none focus:border-neon-gold focus:shadow-[0_0_15px_rgba(255,184,0,0.2)] transition-all"
                />
              </div>

              <ul className="mt-4 max-h-64 divide-y divide-night-800/80 overflow-y-auto rounded-xl border border-night-700 bg-night-900/90 pr-1">
                {results.length === 0 && (
                  <li className="px-4 py-6 text-center text-xs text-night-500">No stops found.</li>
                )}
                {results.map((stop) => {
                  const isSelected = selected?.id === stop.id;
                  return (
                    <li key={stop.id}>
                      <button
                        onClick={() => setSelected(stop)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-xs sm:text-sm transition-colors ${
                          isSelected
                            ? "bg-neon-gold/15 text-neon-gold font-semibold"
                            : "text-white hover:bg-night-800"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isSelected
                                ? "bg-neon-gold shadow-[0_0_10px_#FFB800]"
                                : "bg-night-600"
                            }`}
                          />
                          {stop.name}
                        </span>
                        {stop.distanceM !== undefined && (
                          <span className="font-mono text-xs text-night-500">
                            {(stop.distanceM / 1000).toFixed(1)} km
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {error && <p className="mt-4 text-xs font-semibold text-alert-500">{error}</p>}

          <button
            disabled={!isReadyToStart || starting}
            onClick={startTrip}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-neon-gold py-4 font-display text-base font-bold text-night-950 shadow-[0_0_25px_rgba(255,184,0,0.4)] transition-all hover:brightness-110 active:scale-98 disabled:opacity-40"
          >
            {starting ? (
              "Starting Session…"
            ) : isReadyToStart ? (
              <>
                <CheckIcon size={20} />
                Activate Alarm for {mode === "stops" ? selected?.name : customName || "Selected Pin"}
              </>
            ) : (
              "Select or search a location to continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
