const DEFAULT_DURATION = 5 * 60;

const intentInput = document.getElementById("intentInput");
const timeDisplay = document.getElementById("timeDisplay");
const timerSubtitle = document.getElementById("timerSubtitle");
const startButton = document.getElementById("startButton");
const checkinButton = document.getElementById("checkinButton");
const checkinList = document.getElementById("checkinList");
const reportPanel = document.getElementById("reportPanel");
const reportIntent = document.getElementById("reportIntent");
const reportLength = document.getElementById("reportLength");
const reportCount = document.getElementById("reportCount");
const reportList = document.getElementById("reportList");
const restartButton = document.getElementById("restartButton");
const presetButtons = Array.from(document.querySelectorAll(".preset"));

let remainingSeconds = DEFAULT_DURATION;
let totalDuration = DEFAULT_DURATION;
let intervalId = null;
let sessionStart = null;
let checkins = [];
let audioContext = null;

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

const renderTime = () => {
  timeDisplay.textContent = formatTime(remainingSeconds);
};

const setCheckinList = (items) => {
  checkinList.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "None yet";
    checkinList.append(empty);
    return;
  }

  items.forEach((stamp) => {
    const chip = document.createElement("span");
    chip.textContent = stamp;
    checkinList.append(chip);
  });
};

const ensureAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
};

const playBell = (variant) => {
  ensureAudioContext();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = variant === "start" ? 660 : 520;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.6, now + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 1.3);
};

const setPresetState = (duration) => {
  presetButtons.forEach((button) => {
    const isActive = Number(button.dataset.duration) === duration;
    button.classList.toggle("active", isActive);
  });
};

const updateDuration = (duration) => {
  totalDuration = duration;
  remainingSeconds = duration;
  renderTime();
  setPresetState(duration);
};

const startSession = () => {
  if (intervalId) {
    return;
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }

  sessionStart = Date.now();
  checkins = [];
  remainingSeconds = totalDuration;
  renderTime();
  setCheckinList(checkins);
  startButton.disabled = true;
  checkinButton.disabled = false;
  presetButtons.forEach((button) => {
    button.disabled = true;
  });
  intentInput.disabled = true;
  timerSubtitle.textContent = "Breathe in and out";
  reportPanel.classList.remove("active");
  playBell("start");

  intervalId = window.setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      renderTime();
      endSession();
      return;
    }
    renderTime();
  }, 1000);
};

const recordCheckin = () => {
  if (!sessionStart) {
    return;
  }
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const label = formatTime(Math.min(elapsed, totalDuration));
  checkins.push(label);
  setCheckinList(checkins);
};

const endSession = () => {
  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }

  playBell("end");
  timerSubtitle.textContent = "Session complete";
  startButton.disabled = false;
  checkinButton.disabled = true;
  presetButtons.forEach((button) => {
    button.disabled = false;
  });
  intentInput.disabled = false;

  reportIntent.textContent = intentInput.value.trim() || "Quiet attention";
  reportLength.textContent = formatTime(totalDuration);
  reportCount.textContent = String(checkins.length);
  reportList.innerHTML = "";

  if (checkins.length === 0) {
    const empty = document.createElement("span");
    empty.textContent = "No check-ins this time.";
    reportList.append(empty);
  } else {
    checkins.forEach((stamp, index) => {
      const row = document.createElement("span");
      row.textContent = `Check-in ${index + 1} at ${stamp}`;
      reportList.append(row);
    });
  }

  reportPanel.classList.add("active");
};

const resetSession = () => {
  remainingSeconds = totalDuration;
  renderTime();
  timerSubtitle.textContent = "Ready to begin";
  checkins = [];
  sessionStart = null;
  setCheckinList(checkins);
  reportPanel.classList.remove("active");
};

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (intervalId) {
      return;
    }
    const duration = Number(button.dataset.duration);
    updateDuration(duration);
  });
});

startButton.addEventListener("click", startSession);
checkinButton.addEventListener("click", recordCheckin);
restartButton.addEventListener("click", resetSession);

renderTime();
setCheckinList(checkins);
setPresetState(totalDuration);
