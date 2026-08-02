/**
 * Cloudinary Image Upload Service
 * Automatically uploads avatar images to Cloudinary CDN
 * Returns a permanent HTTPS image URL (e.g. https://res.cloudinary.com/...)
 */

export async function uploadImageToCloudinary(fileOrBase64) {
  if (!fileOrBase64) return "";

  // If already an HTTP / HTTPS URL, return as-is
  if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("http")) {
    return fileOrBase64;
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "unsigned";

  try {
    const formData = new FormData();
    formData.append("file", fileOrBase64);
    formData.append("upload_preset", uploadPreset);

    console.log("☁️ Uploading avatar image to Cloudinary CDN...");
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.secure_url) {
        console.log("✅ Cloudinary CDN Upload Success:", data.secure_url);
        return data.secure_url;
      }
    } else {
      const errJson = await response.json().catch(() => ({}));
      console.warn("Cloudinary Upload Notice:", errJson?.error?.message || response.statusText);
    }
  } catch (err) {
    console.warn("Cloudinary network exception:", err?.message);
  }

  // Return base64 as fallback if Cloudinary credentials are not set up yet
  return typeof fileOrBase64 === "string" ? fileOrBase64 : "";
}
