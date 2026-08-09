import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import { SearchIcon, MapPinIcon, BusIcon, NavigationIcon, CheckIcon, SlidersIcon, ZapIcon, ClockIcon, HeartIcon, ChevronDownIcon } from "../components/Icons";
import { analyzeTravelPatterns } from "../utils/aiEngine";
import { unlockAudioContext } from "../utils/audio";
import { startBackgroundAudioKeepAlive, requestAllMobilePermissions } from "../utils/backgroundKeepAlive";
import GroupModal from "../components/GroupModal";

// Custom Leaflet SVG marker for map picker
const customPickerIcon = new L.DivIcon({
  html: `<div style="background:#00F0FF;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 25px #00F0FF;border:3px solid #050811" class="animate-bounce"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050811" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function SelectDestination() {
  const { token, user } = useAuth();
  const nav = useNavigate();

  const [mode, setMode] = useState("map");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [allStops, setAllStops] = useState([]);
  const [selected, setSelected] = useState(null);
  
  // Separate suggestions & Accordion toggle state
  const [favSuggestions, setFavSuggestions] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isFavAccordionOpen, setIsFavAccordionOpen] = useState(true);
  const [isAiAccordionOpen, setIsAiAccordionOpen] = useState(true);

  // Custom Map Picker state
  const [mapPin, setMapPin] = useState(null);
  const [customName, setCustomName] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  // Lat/Lng Manual Input state
  const [inputLat, setInputLat] = useState("");
  const [inputLng, setInputLng] = useState("");

  // Map view & location search state
  const [mapCenter, setMapCenter] = useState([11.0168, 76.9558]); // Default Coimbatore area
  const [mapZoom, setMapZoom] = useState(10);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isMapSearching, setIsMapSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [extraDestinations, setExtraDestinations] = useState([]); // Up to 2 additional stops

  useEffect(() => {
    requestAllMobilePermissions().catch(() => {});
    api.allStops()
      .then((res) => setAllStops(Array.isArray(res) ? res : []))
      .catch(() => setAllStops([]));
  }, []);

  useEffect(() => {
    const rawFavs = user?.favoriteLocations && user.favoriteLocations.length > 0
      ? user.favoriteLocations
      : (user?.favoriteLocation ? [user.favoriteLocation] : []);

    const favItems = (Array.isArray(rawFavs) ? rawFavs : [])
      .filter((f) => f && f.name && f.lat != null && f.lng != null)
      .map((f, idx) => ({
        isFavorite: true,
        name: f.name,
        lat: Number(f.lat),
        lng: Number(f.lng),
        tag: `FAVORITE #${idx + 1}`,
        timeOfDay: "Saved Place",
        count: "★",
      }));

    setFavSuggestions(favItems);

    if (token) {
      api.tripHistory(token)
        .then((history) => {
          const suggestions = analyzeTravelPatterns(Array.isArray(history) ? history : []);
          const favNames = new Set(favItems.map((fi) => fi.name ? fi.name.toLowerCase() : ""));
          const filtered = (Array.isArray(suggestions) ? suggestions : []).filter((s) => s && s.name && !favNames.has(s.name.toLowerCase()));
          setAiSuggestions(filtered);
        })
        .catch(() => {
          setAiSuggestions([]);
        });
    } else {
      setAiSuggestions([]);
    }
  }, [token, user?.favoriteLocations, user?.favoriteLocation]);

  const selectAiSuggestion = (sug) => {
    setMapCenter([sug.lat, sug.lng]);
    setMapZoom(14);
    setMapPin({ lat: sug.lat, lng: sug.lng });
    setInputLat(sug.lat.toString());
    setInputLng(sug.lng.toString());
    setCustomName(sug.name);
    setSelected(null);
    setMode("map");
    if (sug.isFavorite) {
      setStatusMessage(`Selected Favorite Location ❤️: "${sug.name}"`);
    } else {
      setStatusMessage(`Selected AI Learned Suggestion: "${sug.name}" (${sug.timeOfDay})`);
    }
  };

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
          const data = await res.json();
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

  const selectSearchResult = (item) => {
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

  const handleMapSearchSubmit = async (e) => {
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
        const data = await res.json();
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

  const handleMapClick = async (lat, lng) => {
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
  const handleApplyCoordinates = (e) => {
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

    // Synchronously unlock Web Audio context & start background audio keep-alive inside user click gesture
    unlockAudioContext();
    startBackgroundAudioKeepAlive();
    requestAllMobilePermissions();

    let destLat;
    let destLng;
    let destName;

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
      let startLat;
      let startLng;
      if ("geolocation" in navigator) {
        await new Promise((resolve) => {
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

  const isReadyToStart = (mode === "stops" && Boolean(selected)) || ((mode === "map" || mode === "coordinates") && Boolean(mapPin));

  const primaryDest = isReadyToStart
    ? {
        id: "dest-1",
        name: mode === "stops" && selected
          ? selected.name
          : customName.trim() || `Map Location (${mapPin?.lat?.toFixed(4)}, ${mapPin?.lng?.toFixed(4)})`,
        lat: mode === "stops" && selected ? Number(selected.latitude ?? selected.lat) : mapPin?.lat,
        lng: mode === "stops" && selected ? Number(selected.longitude ?? selected.lng) : mapPin?.lng,
      }
    : null;

  const allDestinations = primaryDest ? [primaryDest, ...extraDestinations] : [];

  const handleAddStop = () => {
    if (!primaryDest || allDestinations.length >= 3) return;
    const newStop = {
      id: `dest-${allDestinations.length + 1}`,
      name: primaryDest.name,
      lat: primaryDest.lat,
      lng: primaryDest.lng,
    };
    setExtraDestinations((prev) => [...prev, newStop]);
    setStatusMessage(`Added Stop #${allDestinations.length + 1}: ${newStop.name}`);
  };

  const handleRemoveExtraStop = (idx) => {
    setExtraDestinations((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-8">
      <ThunderNeonCanvas />

      {/* Group Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        destination={primaryDest}
        destinations={allDestinations}
      />

      <div className="relative z-10 mx-auto max-w-xl lg:max-w-6xl xl:max-w-7xl">
        <div className="glass-panel-gold rounded-3xl p-5 sm:p-8">
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

          {/* Accordion 1: Saved Favorite Locations */}
          {favSuggestions.length > 0 && (
            <div className="mt-5 rounded-2xl border border-alert-500/50 bg-night-900/90 shadow-[0_0_20px_rgba(255,46,85,0.15)] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsFavAccordionOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-4 bg-night-950/60 hover:bg-alert-500/10 transition-colors text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <HeartIcon size={16} className="text-alert-500 fill-alert-500 animate-pulse" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-alert-500">
                    Saved Favorite Locations ({favSuggestions.length})
                  </h3>
                  <span className="rounded-full bg-alert-500/20 text-alert-500 px-2 py-0.5 text-[10px] font-bold">
                    Quick Access
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-night-400 hidden sm:inline">
                    {isFavAccordionOpen ? "Hide Favorites" : "Show Favorites"}
                  </span>
                  <ChevronDownIcon
                    size={18}
                    className={`text-alert-500 transition-transform duration-300 ${
                      isFavAccordionOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
              </button>

              {isFavAccordionOpen && (
                <div className="p-4 pt-2 border-t border-alert-500/20">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {favSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectAiSuggestion(sug)}
                        className="group rounded-xl border border-alert-500/70 bg-alert-500/10 p-3 text-left transition-all active:scale-98 shadow-[0_0_15px_rgba(255,46,85,0.2)] hover:border-alert-500 hover:bg-alert-500/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-alert-500 text-white px-2 py-0.5 text-[10px] font-bold truncate flex items-center gap-1 shadow-[0_0_10px_rgba(255,46,85,0.5)]">
                            <HeartIcon size={11} className="fill-white" />
                            {sug.tag}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-alert-500 group-hover:text-white transition-colors truncate flex items-center gap-1.5">
                          <HeartIcon size={13} className="text-alert-500 fill-alert-500 shrink-0" />
                          <span className="truncate">{sug.name}</span>
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-night-400 font-mono">
                          <span>{sug.timeOfDay}</span>
                          <span className="text-alert-500 font-bold">❤️ Favorite</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion 2: AI Smart Travel Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="mt-4 rounded-2xl border border-neon-purple/50 bg-night-900/90 shadow-[0_0_20px_rgba(176,38,255,0.15)] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setIsAiAccordionOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-4 bg-night-950/60 hover:bg-neon-purple/10 transition-colors text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <ZapIcon size={16} className="text-neon-purple animate-pulse" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-neon-purple">
                    AI Smart Travel Suggestions ({aiSuggestions.length})
                  </h3>
                  <span className="rounded-full bg-neon-purple/20 text-neon-purple px-2 py-0.5 text-[10px] font-bold">
                    Learned Patterns
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-night-400 hidden sm:inline">
                    {isAiAccordionOpen ? "Hide AI Suggestions" : "Show AI Suggestions"}
                  </span>
                  <ChevronDownIcon
                    size={18}
                    className={`text-neon-purple transition-transform duration-300 ${
                      isAiAccordionOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
              </button>

              {isAiAccordionOpen && (
                <div className="p-4 pt-2 border-t border-neon-purple/20">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {aiSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectAiSuggestion(sug)}
                        className="group rounded-xl border border-night-700 bg-night-950/80 p-3 text-left transition-all active:scale-98 hover:border-neon-purple hover:bg-neon-purple/10 hover:shadow-[0_0_15px_rgba(176,38,255,0.3)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-neon-purple/20 text-neon-purple px-2 py-0.5 text-[10px] font-bold truncate">
                            {sug.tag}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-white group-hover:text-neon-purple transition-colors truncate">
                          {sug.name}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-night-400 font-mono">
                          <span>{sug.timeOfDay}</span>
                          <span className="text-neon-cyan">{sug.count} trip{sug.count > 1 ? "s" : ""}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Desktop 2-Column Dashboard Grid / Mobile Vertical Stack */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Control Panel Column */}
            <div className="lg:col-span-5 space-y-5">
              {/* Mode Switcher Tabs */}
              <div className="flex rounded-xl bg-night-950/80 p-1.5 border border-night-700">
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

              {/* Mode 1 Controls: Search Location */}
              {mode === "map" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-neon-cyan flex items-center gap-1.5">
                      <SearchIcon size={14} /> Search Location on Map:
                    </label>
                    <span className="text-[11px] font-semibold text-night-500">Auto-zoom & Pin</span>
                  </div>

                  <div className="relative z-30">
                    <form onSubmit={handleMapSearchSubmit} className="relative flex items-center">
                      <SearchIcon className="absolute left-3.5 text-neon-cyan" size={18} />
                      <input
                        value={mapSearchQuery}
                        onChange={(e) => setMapSearchQuery(e.target.value)}
                        placeholder="Search place (e.g. Karumathampatti)..."
                        className="w-full rounded-xl border border-neon-cyan/50 bg-night-950/95 pl-10 pr-24 py-3.5 text-sm text-white placeholder-night-500 outline-none focus:border-neon-cyan focus:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 rounded-lg bg-neon-cyan px-3.5 py-2 text-xs font-extrabold text-night-950 shadow-[0_0_10px_#00F0FF] hover:brightness-110 active:scale-95 transition-all"
                      >
                        {isMapSearching ? "Searching…" : "Search"}
                      </button>
                    </form>

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

              {/* Mode 2 Controls: Exact Coordinates Input */}
              {mode === "coordinates" && (
                <div className="rounded-2xl border border-neon-purple/40 bg-night-900/90 p-4 sm:p-5 space-y-4">
                  <h3 className="text-sm font-bold text-neon-purple uppercase tracking-wider flex items-center gap-2">
                    <SlidersIcon size={16} /> Enter Coordinates (Lat & Lng)
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
              )}

              {/* Mode 3 Controls: Corridor Bus Stops */}
              {mode === "stops" && (
                <div className="space-y-3">
                  <div className="relative">
                    <SearchIcon className="absolute left-3.5 top-3.5 text-night-500" size={18} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search bus stop, e.g. Salem, Chennai..."
                      className="w-full rounded-xl border border-night-700 bg-night-900/90 pl-10 pr-4 py-3 text-sm text-white placeholder-night-500 outline-none focus:border-neon-gold focus:shadow-[0_0_15px_rgba(255,184,0,0.2)] transition-all"
                    />
                  </div>

                  <ul className="max-h-64 lg:max-h-80 divide-y divide-night-800/80 overflow-y-auto rounded-xl border border-night-700 bg-night-900/90 pr-1">
                    {results.length === 0 && (
                      <li className="px-4 py-6 text-center text-xs text-night-500">No stops found.</li>
                    )}
                    {results.map((stop) => {
                      const isSelected = selected?.id === stop.id;
                      return (
                        <li key={stop.id}>
                          <button
                            onClick={() => {
                              setSelected(stop);
                              const sLat = Number(stop.latitude ?? stop.lat);
                              const sLng = Number(stop.longitude ?? stop.lng);
                              if (!isNaN(sLat) && !isNaN(sLng)) {
                                setMapCenter([sLat, sLng]);
                                setMapZoom(14);
                              }
                            }}
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

              {error && <p className="text-xs font-semibold text-alert-500">{error}</p>}

              {/* Start Session / Activate Alarm Button */}
              <button
                disabled={!isReadyToStart || starting}
                onClick={startTrip}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neon-gold py-4 px-4 text-center font-display text-sm sm:text-base font-bold text-night-950 shadow-[0_0_25px_rgba(255,184,0,0.4)] transition-all hover:brightness-110 active:scale-98 disabled:opacity-40"
              >
                {starting ? (
                  "Starting Session…"
                ) : isReadyToStart ? (
                  <span className="flex items-center justify-center gap-2 text-center w-full min-w-0">
                    <CheckIcon size={20} className="shrink-0" />
                    <span className="truncate">
                      Activate Alarm for {mode === "stops" ? selected?.name : customName || "Selected Pin"}
                    </span>
                  </span>
                ) : (
                  "Select or search a location to continue"
                )}
              </button>

              {/* Multi-destination Badges (Up to 3 Stops) */}
              {allDestinations.length > 0 && (
                <div className="rounded-2xl border border-neon-cyan/40 bg-night-900/90 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neon-cyan uppercase tracking-wider">
                      Group Drop-off Stops ({allDestinations.length}/3)
                    </span>
                    {allDestinations.length < 3 && isReadyToStart && (
                      <button
                        type="button"
                        onClick={handleAddStop}
                        className="text-[11px] font-semibold text-neon-cyan hover:underline"
                      >
                        + Add Current as Stop #{allDestinations.length + 1}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {allDestinations.map((d, i) => (
                      <div key={d.id || i} className="flex items-center justify-between rounded-xl bg-night-950 px-3 py-2 text-xs border border-night-800">
                        <span className="flex items-center gap-2 truncate">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neon-cyan/20 text-[10px] font-extrabold text-neon-cyan">
                            #{i + 1}
                          </span>
                          <span className="text-white font-medium truncate">{d.name}</span>
                        </span>
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraStop(i - 1)}
                            className="text-night-500 hover:text-alert-500 text-xs px-1.5 py-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group Trip Button */}
              <button
                disabled={!isReadyToStart}
                onClick={() => setIsGroupModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-neon-purple/50 bg-neon-purple/10 py-3.5 px-4 text-center font-display text-sm font-bold text-neon-purple shadow-[0_0_15px_rgba(176,38,255,0.15)] transition-all hover:bg-neon-purple/20 hover:shadow-[0_0_25px_rgba(176,38,255,0.3)] active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Start Group Trip ({allDestinations.length > 1 ? `${allDestinations.length} Stops` : "Group Mode"})
              </button>
            </div>

            {/* Right Column: Prominent Interactive Map Display */}
            <div className="lg:col-span-7 space-y-3">
              {/* Status Hint */}
              {statusMessage ? (
                <div className="rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 p-3 text-xs text-neon-cyan font-medium flex items-center gap-2">
                  <MapPinIcon size={14} className="shrink-0 text-neon-cyan" />
                  <span>{statusMessage}</span>
                </div>
              ) : (
                <p className="text-xs text-neon-cyan font-semibold flex items-center gap-1.5">
                  <MapPinIcon size={14} /> Tap anywhere on map below to set or adjust destination pin:
                </p>
              )}

              {/* Responsive Map Container: 280px on mobile, 520px+ on desktop */}
              <div className="h-72 sm:h-80 lg:h-[500px] xl:h-[540px] overflow-hidden rounded-2xl border border-neon-cyan/50 shadow-[0_0_25px_rgba(0,240,255,0.2)] relative z-10">
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
                  {(mapPin || (mode === "stops" && selected && (selected.latitude != null || selected.lat != null))) && (
                    <Marker
                      position={
                        mapPin
                          ? [mapPin.lat, mapPin.lng]
                          : [
                              Number(selected.latitude ?? selected.lat),
                              Number(selected.longitude ?? selected.lng),
                            ]
                      }
                      icon={customPickerIcon}
                    >
                      <Popup className="font-sans text-xs font-semibold">
                        {mode === "stops" ? selected?.name : customName || "Selected Destination Pin"}
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
