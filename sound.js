const Sound = {
  background: null,
  isMuted: false,

  init() {
    this.background = document.getElementById("bgMusic");
    this.background.volume = 0.3;

    // Tambahkan tombol mute
    const muteButton = document.createElement("button");
    muteButton.innerHTML = "🔊";
    muteButton.className = "mute-button";
    muteButton.onclick = () => this.toggleMute();
    document.body.appendChild(muteButton);

    // Event listener untuk tombol
    document.addEventListener("click", (e) => {
      if (
        e.target.tagName === "BUTTON" &&
        !e.target.classList.contains("mute-button")
      ) {
        this.playClick();
      }
    });
  },

  playClick() {
    if (this.isMuted) return;
    const audio = document.getElementById("buttonClick");
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.play().catch((e) => console.log("Error playing sound:", e));
  },

  playCorrect() {
    if (this.isMuted) return;
    const audio = document.getElementById("correctAnswer");
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.play().catch((e) => console.log("Error playing sound:", e));
  },

  playWrong() {
    if (this.isMuted) return;
    const audio = document.getElementById("wrongAnswer");
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.play().catch((e) => console.log("Error playing sound:", e));
  },

  startBackground() {
    if (!this.isMuted) {
      this.background
        .play()
        .catch((e) => console.log("Error playing background:", e));
    }
  },

  stopBackground() {
    this.background.pause();
    this.background.currentTime = 0;
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    const muteButton = document.querySelector(".mute-button");

    if (this.isMuted) {
      muteButton.innerHTML = "🔇";
      this.background.pause();
    } else {
      muteButton.innerHTML = "🔊";
      this.background
        .play()
        .catch((e) => console.log("Error playing background:", e));
    }
  },
};

// Export Sound object
window.Sound = Sound;
