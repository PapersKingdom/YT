const videoUrlInput = document.getElementById("video-url");
const fetchInfoButton = document.getElementById("fetch-info");
const downloadButton = document.getElementById("download-btn");
const resetButton = document.getElementById("reset-btn");
const formatSelect = document.getElementById("format-select");
const audioOnlyCheckbox = document.getElementById("audio-only");
const audioFormatSelect = document.getElementById("audio-format");
const infoCard = document.getElementById("info-card");
const videoThumb = document.getElementById("video-thumb");
const videoTitle = document.getElementById("video-title");
const videoMeta = document.getElementById("video-meta");
const statusText = document.getElementById("status");
const formatCount = document.getElementById("format-count");
const audioState = document.getElementById("audio-state");
const subtitleCount = document.getElementById("subtitle-count");

const subtitleButtons = Array.from(document.querySelectorAll(".subtitle-btn"));
const selectedSubtitles = new Set();

const baseButtonClass =
  "rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/10";
const activeButtonClass = "bg-electric text-white border-electric";

subtitleButtons.forEach((button) => {
  button.className = `${baseButtonClass}`;
  button.addEventListener("click", () => {
    const lang = button.dataset.lang;
    if (selectedSubtitles.has(lang)) {
      selectedSubtitles.delete(lang);
      button.className = baseButtonClass;
    } else {
      selectedSubtitles.add(lang);
      button.className = `${baseButtonClass} ${activeButtonClass}`;
    }
    subtitleCount.textContent = String(selectedSubtitles.size);
  });
});

function setStatus(message, tone = "text-slate-400") {
  statusText.className = `mt-4 text-sm ${tone}`;
  statusText.textContent = message;
}

function formatLabel(format) {
  const parts = [];
  if (format.resolution) parts.push(format.resolution);
  if (format.ext) parts.push(format.ext.toUpperCase());
  if (format.format_note) parts.push(format.format_note);
  if (format.tbr) parts.push(`${Math.round(format.tbr)}kbps`);
  return parts.join(" • ") || format.format_id;
}

async function fetchFormats() {
  const url = videoUrlInput.value.trim();
  if (!url) {
    setStatus("Please add a valid URL.", "text-ember");
    return;
  }

  setStatus("Analyzing link and loading formats...");
  formatSelect.innerHTML = "<option value=\"\">Auto (Best)</option>";

  try {
    const response = await fetch("/api/formats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to load formats.");
    }

    const data = await response.json();
    infoCard.classList.remove("hidden");
    videoThumb.src = data.thumbnail || "";
    videoTitle.textContent = data.title || "Untitled";
    const duration = data.duration ? `${Math.round(data.duration / 60)} min` : "";
    videoMeta.textContent = `${data.uploader || "Unknown uploader"} ${duration}`.trim();

    data.formats.forEach((format) => {
      const option = document.createElement("option");
      option.value = format.format_id;
      option.textContent = formatLabel(format);
      formatSelect.appendChild(option);
    });

    formatCount.textContent = String(data.formats.length);
    setStatus("Formats loaded. Ready to download!", "text-moss");
  } catch (error) {
    setStatus(error.message, "text-ember");
  }
}

async function downloadVideo() {
  const url = videoUrlInput.value.trim();
  if (!url) {
    setStatus("Please add a URL before downloading.", "text-ember");
    return;
  }

  setStatus("Preparing download...", "text-slate-300");
  const payload = {
    url,
    format_id: formatSelect.value || null,
    extract_audio: audioOnlyCheckbox.checked,
    audio_format: audioFormatSelect.value,
    subtitle_langs: Array.from(selectedSubtitles),
  };

  audioState.textContent = audioOnlyCheckbox.checked ? "Yes" : "No";

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Download failed.");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "ytpulse-download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    setStatus("Download started. Check your downloads folder.", "text-moss");
  } catch (error) {
    setStatus(error.message, "text-ember");
  }
}

function resetForm() {
  videoUrlInput.value = "";
  formatSelect.innerHTML = "<option value=\"\">Auto (Best)</option>";
  audioOnlyCheckbox.checked = false;
  selectedSubtitles.clear();
  subtitleButtons.forEach((button) => (button.className = baseButtonClass));
  infoCard.classList.add("hidden");
  formatCount.textContent = "0";
  subtitleCount.textContent = "0";
  audioState.textContent = "No";
  setStatus("Ready for a new link.");
}

fetchInfoButton.addEventListener("click", fetchFormats);
downloadButton.addEventListener("click", downloadVideo);
resetButton.addEventListener("click", resetForm);

audioOnlyCheckbox.addEventListener("change", () => {
  audioState.textContent = audioOnlyCheckbox.checked ? "Yes" : "No";
});
