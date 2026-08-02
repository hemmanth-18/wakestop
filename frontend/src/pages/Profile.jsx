import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { uploadImageToCloudinary } from "../services/cloudinary";
import ThunderNeonCanvas from "../components/ThunderNeonCanvas";
import {
  UserIcon,
  CameraIcon,
  TrashIcon,
  LockIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  AlertIcon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
} from "../components/Icons";

function getPasswordStrength(pass) {
  if (!pass) return { score: 0, label: "", color: "bg-night-800" };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { score: 33, label: "Weak", color: "bg-alert-500", text: "text-alert-500" };
  if (score <= 4) return { score: 66, label: "Fair", color: "bg-neon-gold", text: "text-neon-gold" };
  return { score: 100, label: "Strong", color: "bg-neon-emerald", text: "text-neon-emerald" };
}

export default function Profile() {
  const { user, updateUserProfile, changePassword, deleteHistory } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Profile Edit State
  const [username, setUsername] = useState(user?.name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Favorite Location State
  const [favName, setFavName] = useState(user?.favoriteLocation?.name || "");
  const [favLat, setFavLat] = useState(user?.favoriteLocation?.lat != null ? String(user.favoriteLocation.lat) : "");
  const [favLng, setFavLng] = useState(user?.favoriteLocation?.lng != null ? String(user.favoriteLocation.lng) : "");
  const [isSavingFav, setIsSavingFav] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  const newStrength = getPasswordStrength(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  // Image Upload Handler (convert & resize to optimized Base64 JPEG)
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast("Image file size must be less than 8MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const maxDim = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);

        try {
          const cdnImageUrl = await uploadImageToCloudinary(compressedBase64);
          await updateUserProfile({ profileImage: cdnImageUrl });
          showToast("Profile picture updated successfully!", "success");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Failed to update profile picture", "error");
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Remove Profile Image
  async function handleRemoveImage() {
    try {
      await updateUserProfile({ profileImage: "" });
      showToast("Profile picture removed", "success");
    } catch (err) {
      showToast("Failed to remove profile picture", "error");
    }
  }

  // Save Username
  async function handleSaveUsername(e) {
    e.preventDefault();
    if (!username.trim()) {
      showToast("Username cannot be empty", "error");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateUserProfile({ name: username.trim() });
      showToast("Username updated successfully!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update username", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  // Handle Change Password Submit
  async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Please fill in all password fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New password and confirm password do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters long", "error");
      return;
    }
    if (currentPassword === newPassword) {
      showToast("New password cannot be identical to current password", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast("Password updated successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to change password", "error");
    } finally {
      setIsChangingPassword(false);
    }
  }

  // Save Favorite Location
  async function handleSaveFavorite(e) {
    if (e) e.preventDefault();
    if (!favName.trim()) {
      showToast("Please enter a name for your favorite location", "error");
      return;
    }
    const lat = parseFloat(favLat);
    const lng = parseFloat(favLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast("Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180)", "error");
      return;
    }

    setIsSavingFav(true);
    try {
      await updateUserProfile({
        favoriteLocation: {
          name: favName.trim(),
          lat,
          lng,
        },
      });
      showToast("Favorite location saved successfully! ❤️", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save favorite location", "error");
    } finally {
      setIsSavingFav(false);
    }
  }

  // Clear Favorite Location
  async function handleRemoveFavorite() {
    setIsSavingFav(true);
    try {
      await updateUserProfile({ favoriteLocation: null });
      setFavName("");
      setFavLat("");
      setFavLng("");
      showToast("Favorite location removed", "success");
    } catch (err) {
      showToast("Failed to remove favorite location", "error");
    } finally {
      setIsSavingFav(false);
    }
  }

  // Use Current GPS Location
  function handleUseCurrentGps() {
    if (!("geolocation" in navigator)) {
      showToast("Geolocation is not supported by your browser", "error");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setFavLat(lat);
        setFavLng(lng);
        showToast(`Acquired location: Lat ${lat}, Lng ${lng}`, "success");

        if (!favName.trim()) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                const parts = data.display_name.split(",");
                const shortName = parts.slice(0, 2).join(",").trim();
                if (shortName) setFavName(shortName);
              }
            }
          } catch (_) {}
        }
        setIsGettingGps(false);
      },
      (err) => {
        showToast("Could not retrieve current location: " + err.message, "error");
        setIsGettingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Handle Delete All History Confirmation
  async function handleConfirmDeleteHistory() {
    setIsDeletingHistory(true);
    try {
      await deleteHistory();
      showToast("All trip history has been permanently deleted.", "success");
      setShowDeleteModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete history", "error");
    } finally {
      setIsDeletingHistory(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)] px-4 py-8">
      <ThunderNeonCanvas />

      <div className="relative z-10 mx-auto max-w-xl lg:max-w-4xl space-y-6">
        {/* Title Header */}
        <div className="glass-panel-gold rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <UserIcon size={26} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                User Profile & Account
              </h1>
              <p className="mt-0.5 text-xs text-night-500 sm:text-sm">
                Manage your avatar, security credentials, and trip data.
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Profile Grid (Desktop 2-Column Dashboard) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Avatar & Basic Profile Information */}
          <div className="lg:col-span-6 space-y-6">
            {/* Avatar & Username Card */}
            <div className="glass-panel rounded-3xl p-6 border-neon-cyan/30 space-y-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neon-cyan flex items-center gap-2">
                <UserIcon size={16} /> Profile Information
              </h2>

              {/* Avatar Showcase & Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-neon-cyan shadow-[0_0_25px_rgba(0,240,255,0.4)] bg-night-950 flex items-center justify-center">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-4xl font-extrabold text-neon-cyan">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-neon-cyan text-night-950 shadow-[0_0_10px_#00F0FF] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    title="Upload profile picture"
                  >
                    <CameraIcon size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2 w-full">
                  <p className="text-xs text-night-400 font-semibold">Avatar Image</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-3.5 py-2 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-all cursor-pointer"
                    >
                      Change Photo
                    </button>
                    {user?.profileImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="rounded-xl border border-alert-500/40 bg-alert-500/10 px-3.5 py-2 text-xs font-bold text-alert-500 hover:bg-alert-500/20 transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Username Edit Form */}
              <form onSubmit={handleSaveUsername} className="space-y-4 pt-2 border-t border-night-800">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-night-400">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-night-700 bg-night-950 px-3.5 py-3 text-sm text-white outline-none focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-night-500">
                    Registered Email (Read-Only)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full rounded-xl border border-night-800 bg-night-950/50 px-3.5 py-3 text-sm text-night-400 outline-none cursor-not-allowed opacity-80"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-night-400 font-mono">
                  <ClockIcon size={14} className="text-neon-cyan" />
                  <span>
                    Member since:{" "}
                    <span className="text-white font-bold">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Active User"}
                    </span>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full rounded-xl bg-neon-cyan py-3 font-display font-bold text-night-950 shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isUpdatingProfile ? "Saving Username…" : "Save Username"}
                </button>
              </form>
            </div>

            {/* History Management Card */}
            <div className="glass-panel rounded-3xl p-6 border-alert-500/30 space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-alert-500 flex items-center gap-2">
                <TrashIcon size={16} /> History Management
              </h2>
              <p className="text-xs text-night-400 leading-relaxed">
                Permanently delete your saved trip history records from the WakeStop server.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-alert-500/50 bg-alert-500/10 py-3 text-xs font-extrabold text-alert-500 shadow-[0_0_15px_rgba(255,46,85,0.2)] hover:bg-alert-500 hover:text-white transition-all cursor-pointer"
              >
                <TrashIcon size={16} /> Delete All Trip History
              </button>
            </div>
          </div>

          {/* Right Column: Change Password Section */}
          <div className="lg:col-span-6">
            <div className="glass-panel rounded-3xl p-6 border-neon-purple/30 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-neon-purple flex items-center gap-2">
                  <LockIcon size={16} /> Change Password
                </h2>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-neon-gold hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white">
                    Current Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-night-700 bg-night-950 pl-3.5 pr-11 py-3 text-sm text-white outline-none focus:border-neon-purple focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 text-night-400 hover:text-neon-purple transition-colors"
                    >
                      {showCurrent ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-night-700 bg-night-950 pl-3.5 pr-11 py-3 text-sm text-white outline-none focus:border-neon-purple focus:shadow-[0_0_15px_rgba(176,38,255,0.2)] transition-all"
                      placeholder="At least 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 text-night-400 hover:text-neon-purple transition-colors"
                    >
                      {showNew ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>

                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-night-400">Strength:</span>
                        <span className={`font-bold ${newStrength.text}`}>{newStrength.label}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-night-950 overflow-hidden border border-night-800">
                        <div
                          className={`h-full ${newStrength.color} transition-all duration-300`}
                          style={{ width: `${newStrength.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full rounded-xl border bg-night-950 pl-3.5 pr-11 py-3 text-sm text-white outline-none transition-all ${
                        confirmPassword.length > 0
                          ? isMatch
                            ? "border-neon-emerald/60 focus:border-neon-emerald"
                            : "border-alert-500/60 focus:border-alert-500"
                          : "border-night-700 focus:border-neon-purple"
                      }`}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 text-night-400 hover:text-neon-purple transition-colors"
                    >
                      {showConfirm ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>

                  {confirmPassword.length > 0 && (
                    <p
                      className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${
                        isMatch ? "text-neon-emerald" : "text-alert-500"
                      }`}
                    >
                      {isMatch ? (
                        <>
                          <CheckIcon size={12} /> Passwords match
                        </>
                      ) : (
                        <>
                          <AlertIcon size={12} /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl bg-neon-purple py-3.5 font-display font-bold text-white shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isChangingPassword ? "Updating Password…" : "Update Password"}
                </button>
              </form>
            </div>

            {/* Favorite Location Card */}
            <div className="glass-panel rounded-3xl p-6 border-alert-500/40 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-alert-500 flex items-center gap-2">
                  <HeartIcon size={18} className="text-alert-500 fill-alert-500" /> Favorite Location
                </h2>
                {user?.favoriteLocation && (
                  <span className="rounded-full bg-alert-500/15 border border-alert-500/40 px-2.5 py-0.5 text-[10px] font-extrabold text-alert-500 uppercase tracking-wider">
                    Active Saved
                  </span>
                )}
              </div>

              <p className="text-xs text-night-400 leading-relaxed">
                Save your home, work, or frequent stop based on Latitude & Longitude. It will appear at the top of AI destination recommendations!
              </p>

              <form onSubmit={handleSaveFavorite} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-night-400">
                    Location Title / Address Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Home, Work, Koramangala..."
                    value={favName}
                    onChange={(e) => setFavName(e.target.value)}
                    className="w-full rounded-xl border border-night-700 bg-night-950 px-3.5 py-3 text-sm text-white outline-none focus:border-alert-500 focus:shadow-[0_0_15px_rgba(255,46,85,0.2)] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-night-400">
                      Latitude (Lat)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 11.0168"
                      value={favLat}
                      onChange={(e) => setFavLat(e.target.value)}
                      className="w-full rounded-xl border border-night-700 bg-night-950 px-3.5 py-3 text-sm text-white outline-none focus:border-alert-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-night-400">
                      Longitude (Lng)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 76.9558"
                      value={favLng}
                      onChange={(e) => setFavLng(e.target.value)}
                      className="w-full rounded-xl border border-night-700 bg-night-950 px-3.5 py-3 text-sm text-white outline-none focus:border-alert-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={isGettingGps}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 py-2.5 text-xs font-bold text-neon-cyan hover:bg-neon-cyan/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <MapPinIcon size={14} />
                  {isGettingGps ? "Acquiring GPS location…" : "Use Current GPS Location"}
                </button>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingFav}
                    className="flex-1 rounded-xl bg-alert-500 py-3 font-display font-bold text-white shadow-[0_0_15px_rgba(255,46,85,0.3)] hover:brightness-110 active:scale-98 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <HeartIcon size={16} className="fill-white" />
                    {isSavingFav ? "Saving…" : "Save Favorite"}
                  </button>

                  {user?.favoriteLocation && (
                    <button
                      type="button"
                      onClick={handleRemoveFavorite}
                      disabled={isSavingFav}
                      className="rounded-xl border border-night-700 bg-night-950 px-4 py-3 text-xs font-bold text-night-400 hover:text-alert-500 hover:border-alert-500/50 transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom Confirmation Modal: Delete History ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-night-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-alert-500 bg-night-950 p-6 shadow-[0_0_40px_rgba(255,46,85,0.3)] space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-alert-500/20 text-alert-500 border border-alert-500/40 shadow-[0_0_15px_rgba(255,46,85,0.4)] alarm-shake">
              <AlertIcon size={28} />
            </div>

            <h3 className="font-display text-xl font-extrabold text-white">Are you sure?</h3>
            <p className="text-xs text-night-400 leading-relaxed">
              This action will permanently wipe all your saved trip history records from WakeStop. <span className="text-alert-500 font-bold">This action cannot be undone.</span>
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border border-night-700 bg-night-900 py-3 text-xs font-bold text-night-400 hover:border-white hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingHistory}
                onClick={handleConfirmDeleteHistory}
                className="flex-1 rounded-xl bg-alert-500 py-3 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(255,46,85,0.5)] hover:bg-alert-600 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeletingHistory ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
