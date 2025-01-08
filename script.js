// Pastikan variabel global diinisialisasi terlebih dahulu
window.currentQuestion = 0;
window.score = 0;
window.timer = null;
window.playerName = "";
window.challengePoints = 0;

// Inisialisasi Supabase dengan createClient dari window.supabase
window._supabase = window.supabase.createClient(
  "https://nmwbbigdmbphfqfrrrml.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td2JiaWdkbWJwaGZxZnJycm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNTkxMzIsImV4cCI6MjA1MTkzNTEzMn0.6Yagzmb4WFRYMV846aVx4HAGbDrY3bD1i2oTzFtZlfo"
);

// Fungsi untuk mengecek nama di database
async function checkExistingPlayer(name) {
  try {
    const { data, error } = await window._supabase
      .from("scores")
      .select("*")
      .eq("name", name)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking player:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// Fungsi untuk menampilkan custom alert
function showCustomAlert(options = {}) {
  const {
    title = "Perhatian",
    message = "",
    type = "info", // info, success, warning, error
    buttons = [
      {
        text: "OK",
        type: "primary",
        onClick: () => closeCustomAlert(),
      },
    ],
  } = options;

  // Buat overlay
  const overlay = document.createElement("div");
  overlay.className = "alert-overlay";
  document.body.appendChild(overlay);

  // Buat alert container
  const alertBox = document.createElement("div");
  alertBox.className = "custom-alert";

  // Icon berdasarkan type
  const icons = {
    success: "✅",
    warning: "⚠️",
    error: "❌",
    info: "ℹ️",
  };

  // Buat konten alert
  alertBox.innerHTML = `
        <div class="alert-icon ${type}">${icons[type] || icons.info}</div>
        <h3 class="alert-title">${title}</h3>
        <p class="alert-message">${message}</p>
        <div class="alert-buttons">
            ${buttons
              .map(
                (btn) => `
                <button class="alert-btn ${btn.type || "secondary"}">${
                  btn.text
                }</button>
            `
              )
              .join("")}
        </div>
    `;

  document.body.appendChild(alertBox);

  // Tambahkan event listeners untuk tombol
  const buttonElements = alertBox.querySelectorAll(".alert-btn");
  buttons.forEach((btn, index) => {
    buttonElements[index].addEventListener("click", btn.onClick);
  });

  // Tampilkan alert dengan animasi
  setTimeout(() => {
    overlay.classList.add("show");
    alertBox.classList.add("show");
  }, 10);
}

// Fungsi untuk menutup custom alert
function closeCustomAlert() {
  const overlay = document.querySelector(".alert-overlay");
  const alertBox = document.querySelector(".custom-alert");

  if (overlay && alertBox) {
    overlay.classList.remove("show");
    alertBox.classList.remove("show");

    setTimeout(() => {
      overlay.remove();
      alertBox.remove();
    }, 300);
  }
}

// Fungsi untuk memulai quiz
async function startQuiz() {
  const inputName = document.getElementById("player-name").value;

  if (!inputName) {
    showCustomAlert({
      title: "Peringatan",
      message: "Mohon masukkan nama Anda",
      type: "warning",
    });
    return;
  }

  window.playerName = inputName;

  // Cek apakah pemain sudah ada
  const existingPlayer = await checkExistingPlayer(window.playerName);
  if (existingPlayer) {
    showCustomAlert({
      title: "Selamat Datang Kembali!",
      message: `${window.playerName}, score sebelumnya: ${existingPlayer.score}. Main lagi untuk memperbaiki score?`,
      type: "info",
      buttons: [
        {
          text: "Ya",
          type: "primary",
          onClick: () => {
            closeCustomAlert();
            startGame();
          },
        },
        {
          text: "Tidak",
          type: "secondary",
          onClick: () => closeCustomAlert(),
        },
      ],
    });
    return;
  }

  startGame();
}

function updateProgress() {
  const progress = (window.currentQuestion / questions.length) * 100;
  document.querySelector(".progress-fill").style.width = `${progress}%`;
  document.getElementById("current-number").textContent =
    window.currentQuestion + 1;
  document.getElementById("total-questions").textContent = questions.length;
  document.getElementById("current-score").textContent = window.score;
}

function loadQuestion() {
  if (window.currentQuestion >= questions.length) {
    endQuiz();
    return;
  }

  updateProgress();

  const question = questions[window.currentQuestion];
  document.getElementById("question").textContent = question.question;

  const choicesDiv = document.getElementById("choices");
  choicesDiv.innerHTML = "";

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.textContent = choice;

    button.addEventListener("click", () => {
      document.querySelectorAll(".choice-btn").forEach((btn) => {
        btn.classList.remove("selected");
      });

      button.classList.add("selected");

      setTimeout(() => {
        checkAnswer(index);
      }, 300);
    });

    choicesDiv.appendChild(button);
  });
}

function checkAnswer(selectedIndex) {
  const question = questions[window.currentQuestion];
  if (selectedIndex === question.correct) {
    window.score += 10;
    showMessage("Jawaban kamu benar!", "success");
    setTimeout(() => {
      window.currentQuestion++;
      loadQuestion();
    }, 2300); // Tunggu popup hilang
  } else {
    showMessage(
      "Jawaban salah! Selesaikan tantangan untuk mendapatkan point!",
      "error"
    );
    setTimeout(() => {
      showChallenge();
    }, 2300); // Tunggu popup hilang
  }
}

async function endQuiz() {
  if (window.timer) clearInterval(window.timer);

  try {
    const existingPlayer = await checkExistingPlayer(window.playerName);

    if (existingPlayer) {
      if (window.score > existingPlayer.score) {
        const { error } = await window._supabase
          .from("scores")
          .update({ score: window.score })
          .eq("name", window.playerName);

        if (error) throw error;
        showMessage(
          "Score baru lebih tinggi! Score berhasil diupdate! 🎉",
          "success"
        );
      } else {
        showMessage(
          `Score sebelumnya (${existingPlayer.score}) lebih tinggi!`,
          "info"
        );
      }
    } else {
      const { error } = await window._supabase
        .from("scores")
        .insert([{ name: window.playerName, score: window.score }]);

      if (error) throw error;
    }
  } catch (error) {
    console.error("Error saving score:", error);
  }

  document.getElementById("quiz-screen").style.display = "none";
  document.getElementById("result-screen").style.display = "block";
  document.getElementById("final-name").textContent = window.playerName;
  document.getElementById("final-score").textContent = window.score;
}

function showChallenge() {
  // Sembunyikan layar quiz
  document.getElementById("quiz-screen").style.display = "none";

  // Tampilkan tantangan
  const challengeHTML = `
        <div id="challenge-screen" class="challenge-container">
            <h2>Jawaban Salah! 😅</h2>
            <p>Selesaikan tantangan untuk mendapatkan 2 point!</p>
            <div id="math-challenge"></div>
            <input type="number" id="challenge-answer" placeholder="Masukkan jawaban">
            <button onclick="checkChallenge()">Submit</button>
            <p class="challenge-points">Point Tantangan: <span id="challenge-points-display">${window.challengePoints}</span></p>
        </div>
    `;

  // Tambahkan tantangan ke body
  const challengeDiv = document.createElement("div");
  challengeDiv.innerHTML = challengeHTML;
  document.querySelector(".container").appendChild(challengeDiv);

  // Generate soal matematika sederhana
  generateMathChallenge();
}

function generateMathChallenge() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ["+", "-", "x"];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  window.correctAnswer = calculateAnswer(num1, num2, operator);

  document.getElementById(
    "math-challenge"
  ).innerHTML = `<p>Berapakah ${num1} ${operator} ${num2} = ?</p>`;
}

function calculateAnswer(num1, num2, operator) {
  switch (operator) {
    case "+":
      return num1 + num2;
    case "-":
      return num1 - num2;
    case "x":
      return num1 * num2;
    default:
      return 0;
  }
}

function checkChallenge() {
  const userAnswer = parseInt(
    document.getElementById("challenge-answer").value
  );

  if (userAnswer === window.correctAnswer) {
    // Tambah point tantangan langsung ke score
    window.score += 2;

    // Tampilkan pesan sukses
    showMessage("Bagus! +2 point dari tantangan!", "success");

    // Hapus layar tantangan
    document.querySelector("#challenge-screen").remove();

    // Tampilkan kembali quiz
    document.getElementById("quiz-screen").style.display = "block";

    // Lanjut ke pertanyaan berikutnya
    window.currentQuestion++;
    loadQuestion();
  } else {
    showMessage("Jawaban salah, coba lagi!", "error");
    // Generate tantangan baru
    generateMathChallenge();
  }
}

function showMessage(message, type) {
  // Hapus popup yang sudah ada jika masih ada
  const existingPopup = document.querySelector(".popup-notification");
  const existingOverlay = document.querySelector(".popup-overlay");
  if (existingPopup) existingPopup.remove();
  if (existingOverlay) existingOverlay.remove();

  // Buat overlay
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  document.body.appendChild(overlay);

  // Buat popup
  const popup = document.createElement("div");
  popup.className = "popup-notification";

  // Set konten berdasarkan type
  const icons = {
    success: "🎉",
    error: "❌",
    info: "ℹ️",
  };

  const titles = {
    success: "Benar!",
    error: "Oops!",
    info: "Info",
  };

  const scoreDisplay =
    type === "success" ? `<div class="popup-score">+10 Poin</div>` : "";

  popup.innerHTML = `
    <div class="popup-icon">${icons[type] || icons.info}</div>
    <h3 class="popup-title">${titles[type] || titles.info}</h3>
    <p class="popup-message">${message}</p>
    ${scoreDisplay}
  `;

  document.body.appendChild(popup);

  // Tampilkan popup dengan animasi
  requestAnimationFrame(() => {
    overlay.classList.add("show");
    popup.classList.add("show");
  });

  // Hilangkan popup setelah beberapa detik
  setTimeout(() => {
    overlay.classList.remove("show");
    popup.classList.remove("show");

    setTimeout(() => {
      overlay.remove();
      popup.remove();
    }, 300);
  }, 2000);
}

function startTimer() {
  timeLeft = 120; // Reset timer untuk setiap soal
  const timerDisplay = document.getElementById("timer");

  // Clear timer sebelumnya jika ada
  if (window.timer) clearInterval(window.timer);

  window.timer = setInterval(() => {
    timeLeft--;

    // Konversi detik ke format menit:detik
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;

    // Jika waktu habis
    if (timeLeft <= 0) {
      clearInterval(window.timer);
      showTimeUpMessage();
      setTimeout(() => {
        window.currentQuestion++;
        if (window.currentQuestion < questions.length) {
          loadQuestion();
          startTimer();
        } else {
          endQuiz();
        }
      }, 2000);
    }
  }, 1000);
}

function showTimeUpMessage() {
  const timeUpDiv = document.createElement("div");
  timeUpDiv.className = "time-up-message";
  timeUpDiv.textContent = "Waktu Habis!";
  document.querySelector(".container").appendChild(timeUpDiv);

  setTimeout(() => {
    timeUpDiv.remove();
  }, 2000);
}

function showExplanation(isCorrect, questionIndex) {
  const explanations = [
    "Keberagaman mencakup berbagai perbedaan dalam aspek kehidupan, termasuk suku bangsa, budaya, dan tradisi.",
    "Tari Sekapur Sirih adalah tarian penyambutan tamu terhormat di Jambi.",
    "Kajang Leko adalah rumah adat khas Provinsi Jambi.",
    "Keris Siginjai adalah senjata tradisional khas Provinsi Jambi.",
    "Tempoyak adalah makanan khas Jambi yang terbuat dari fermentasi durian.",
    "Tari Sekapur Sirih ditarikan oleh 9 penari perempuan dan 3 penari laki-laki.",
    "Melarang penggunaan bahasa daerah bertentangan dengan upaya pelestarian budaya.",
    "Budaya mencakup semua hasil cipta, rasa, dan karsa manusia termasuk adat istiadat, tradisi, seni, dan nilai-nilai.",
    "Melayu Jambi, Suku Anak Dalam, dan Kerinci adalah suku-suku yang ada di Provinsi Jambi.",
    "Baju adat Jambi terkenal dengan sulaman benang emasnya yang indah.",
  ];

  const explanation = document.createElement("div");
  explanation.className = `explanation ${isCorrect ? "correct" : "incorrect"}`;
  explanation.textContent = explanations[window.currentQuestion];
  document.querySelector(".container").appendChild(explanation);

  setTimeout(() => {
    explanation.remove();
  }, 3000);
}

// Tambahkan fungsi untuk menampilkan high scores
async function showHighScores() {
  try {
    const { data, error } = await window._supabase
      .from("scores")
      .select("*")
      .order("score", { ascending: false })
      .limit(10);

    if (error) throw error;

    let highScoresHTML = `
            <div id="high-scores" class="high-scores-container">
                <h2>Top 10 High Scores</h2>
                <table>
                    <tr>
                        <th>Rank</th>
                        <th>Nama</th>
                        <th>Score</th>
                    </tr>
        `;

    data.forEach((player, index) => {
      highScoresHTML += `
                <tr class="${
                  player.name === window.playerName ? "current-player" : ""
                }">
                    <td>${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.score}</td>
                </tr>
            `;
    });

    highScoresHTML += `
                </table>
                <button onclick="closeHighScores()">Tutup</button>
            </div>
        `;

    document
      .querySelector(".container")
      .insertAdjacentHTML("beforeend", highScoresHTML);
  } catch (error) {
    console.error("Error fetching high scores:", error);
  }
}

function closeHighScores() {
  document.getElementById("high-scores").remove();
}

// Fungsi untuk me-reset game
function resetGame() {
  window.currentQuestion = 0;
  window.score = 0;
  window.challengePoints = 0;
  window.playerName = "";
  if (window.timer) clearInterval(window.timer);

  document.getElementById("result-screen").style.display = "none";
  document.getElementById("welcome-screen").style.display = "block";
  document.getElementById("player-name").value = "";
}

// Fungsi untuk restart quiz
function restartQuiz() {
  const playAgain = confirm("Apakah Anda ingin bermain lagi?");
  if (playAgain) {
    resetGame();
  }
}

// Fungsi untuk memulai game setelah konfirmasi
function startGame() {
  window.currentQuestion = 0;
  window.score = 0;
  window.challengePoints = 0;

  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("quiz-screen").style.display = "block";

  // Set total questions di awal
  document.getElementById("total-questions").textContent = questions.length;

  loadQuestion();
  startTimer();
}

// Tambahkan fungsi untuk handling klik pada feature item
function handleFeatureClick(event) {
  const featureItem = event.currentTarget;

  // Tambahkan efek ripple
  const ripple = document.createElement("div");
  ripple.style.cssText = `
        position: absolute;
        top: ${event.offsetY}px;
        left: ${event.offsetX}px;
        width: 0;
        height: 0;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: all 0.5s ease-out;
    `;

  featureItem.appendChild(ripple);

  // Trigger animation
  requestAnimationFrame(() => {
    ripple.style.width = "300px";
    ripple.style.height = "300px";
    ripple.style.opacity = "0";
  });

  // Clean up
  setTimeout(() => {
    ripple.remove();
    showLeaderboard();
  }, 500);
}

// Update fungsi showLeaderboard untuk animasi yang lebih halus
async function showLeaderboard() {
  try {
    // Tambahkan efek loading
    const loadingOverlay = document.createElement("div");
    loadingOverlay.className = "loading-overlay";
    loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Memuat Papan Peringkat...</p>
            </div>
        `;
    document.body.appendChild(loadingOverlay);

    // Ambil data dari Supabase
    const { data, error } = await window._supabase
      .from("scores")
      .select("*")
      .order("score", { ascending: false });

    if (error) throw error;

    // Hapus loading overlay
    loadingOverlay.remove();

    // Buat dan tampilkan leaderboard
    const leaderboardHTML = `
            <div class="leaderboard">
                <div class="leaderboard-header">
                    <h2 class="leaderboard-title">Papan Peringkat</h2>
                    <p class="leaderboard-subtitle">Top Skor Quiz Game</p>
                </div>
                <div class="leaderboard-content">
                    ${
                      data.length > 0
                        ? `
                        <table class="leaderboard-table">
                            <tbody>
                                ${data
                                  .map(
                                    (player, index) => `
                                    <tr class="leaderboard-row rank-${
                                      index + 1
                                    } ${
                                      player.name === window.playerName
                                        ? "current-player"
                                        : ""
                                    }">
                                        <td class="leaderboard-cell rank">
                                            ${
                                              index + 1 <= 3
                                                ? `<span class="medal">${
                                                    index + 1 === 1
                                                      ? "🥇"
                                                      : index + 1 === 2
                                                      ? "🥈"
                                                      : "🥉"
                                                  }</span>`
                                                : `#${index + 1}`
                                            }
                                        </td>
                                        <td class="leaderboard-cell">
                                            <div class="player-info">
                                                <div class="player-avatar">
                                                    ${player.name
                                                      .charAt(0)
                                                      .toUpperCase()}
                                                </div>
                                                <span class="player-name">${
                                                  player.name
                                                }</span>
                                            </div>
                                        </td>
                                        <td class="leaderboard-cell score">${
                                          player.score
                                        } pts</td>
                                    </tr>
                                `
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    `
                        : `
                        <div class="empty-state">
                            <p>Belum ada data skor</p>
                        </div>
                    `
                    }
                </div>
                <div class="leaderboard-nav">
                    <button class="nav-btn" onclick="closeLeaderboard()">Tutup</button>
                    ${
                      window.playerName
                        ? `<button class="nav-btn" onclick="startQuiz()">Main Lagi</button>`
                        : ""
                    }
                </div>
            </div>
        `;

    // Tambahkan ke DOM
    const leaderboardContainer = document.createElement("div");
    leaderboardContainer.id = "leaderboard-container";
    leaderboardContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

    leaderboardContainer.innerHTML = leaderboardHTML;
    document.body.appendChild(leaderboardContainer);

    // Tambahkan animasi masuk yang lebih halus
    const container = document.getElementById("leaderboard-container");
    container.style.opacity = "0";
    container.style.transform = "scale(0.95)";

    requestAnimationFrame(() => {
      container.style.opacity = "1";
      container.style.transform = "scale(1)";
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    showCustomAlert({
      title: "Error",
      message: "Gagal memuat papan peringkat",
      type: "error",
    });
  }
}

function closeLeaderboard() {
  const container = document.getElementById("leaderboard-container");
  if (container) {
    container.style.opacity = "0";
    setTimeout(() => container.remove(), 300);
  }
}

// Tambahkan tombol untuk menampilkan leaderboard di welcome screen
function addLeaderboardButton() {
  const welcomeForm = document.querySelector(".welcome-form");
  const leaderboardBtn = document.createElement("button");
  leaderboardBtn.className = "nav-btn";
  leaderboardBtn.style.marginTop = "1rem";
  leaderboardBtn.textContent = "Lihat Papan Peringkat";
  leaderboardBtn.onclick = showLeaderboard;
  welcomeForm.appendChild(leaderboardBtn);
}

// Panggil fungsi ini setelah DOM loaded
document.addEventListener("DOMContentLoaded", addLeaderboardButton);

// Tambahkan style untuk loading overlay
const style = document.createElement("style");
style.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
    }

    .loading-spinner {
        text-align: center;
        color: white;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
