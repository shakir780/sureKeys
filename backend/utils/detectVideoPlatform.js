export function detectVideoPlatform(url) {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    return "youtube";
  } else if (lowerUrl.includes("tiktok.com")) {
    return "tiktok";
  } else if (
    lowerUrl.includes("facebook.com") ||
    lowerUrl.includes("fb.watch")
  ) {
    return "facebook";
  } else if (lowerUrl.includes("instagram.com")) {
    return "instagram";
  } else if (lowerUrl.includes("vimeo.com")) {
    return "vimeo";
  } else if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
    return "twitter";
  } else if (lowerUrl.includes("linkedin.com")) {
    return "linkedin";
  } else {
    return "other";
  }
}

export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}
