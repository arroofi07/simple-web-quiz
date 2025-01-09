// Pastikan variabel global diinisialisasi terlebih dahulu
window.currentQuestion = 0;
window.score = 0;
window.timer = null;
window.playerName = "";
window.challengePoints = 0;
window.retryAttempts = {};

// Inisialisasi Supabase dengan createClient dari window.supabase
window._supabase = window.supabase.createClient(
  "https://nmwbbigdmbphfqfrrrml.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td2JiaWdkbWJwaGZxZnJycm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNTkxMzIsImV4cCI6MjA1MTkzNTEzMn0.6Yagzmb4WFRYMV846aVx4HAGbDrY3bD1i2oTzFtZlfo"
);

// Fungsi untuk mengecek nama di database
async function checkExistingPlayer(name) {
  try {
    console.log("Checking for player:", name);
    const { data, error } = await window._supabase
      .from("scores")
      .select("*")
      .eq("name", name)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // PGRST116 means no rows returned, which is fine
        console.log("No existing player found");
        return null;
      }
      console.error("Error checking player:", error);
      throw error;
    }

    console.log("Found existing player:", data);
    return data;
  } catch (error) {
    console.error("Error in checkExistingPlayer:", error);
    throw error;
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

document.addEventListener("DOMContentLoaded", () => {
  Sound.init();
});

// Fungsi untuk memulai quiz
window.startQuiz = async function () {
  Sound.playClick();
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
};

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

  // Reset timer warning class
  const timerDisplay = document.getElementById("timer");
  timerDisplay.classList.remove("timer-warning");

  // Update progress
  document.getElementById("current-number").textContent =
    window.currentQuestion + 1;

  // Load question
  const question = questions[window.currentQuestion];
  document.getElementById("question").textContent = question.question;

  // Load choices
  const choicesContainer = document.getElementById("choices");
  choicesContainer.innerHTML = question.choices
    .map(
      (choice, index) => `
      <button class="choice-btn" onclick="checkAnswer(${index})">
        ${choice}
      </button>
    `
    )
    .join("");

  // Start new timer for this question
  startTimer();

  // Update progress bar
  updateProgress();
}

function checkAnswer(selectedIndex) {
  const question = questions[window.currentQuestion];
  if (selectedIndex === question.correct) {
    Sound.playCorrect();
    window.score += 10;
    showMessage("Jawaban kamu benar!", "success");
    setTimeout(() => {
      window.currentQuestion++;
      loadQuestion();
    }, 2300);
  } else {
    Sound.playWrong();
    if (!window.retryAttempts[window.currentQuestion]) {
      window.retryAttempts[window.currentQuestion] = 1;
      showMessage("Jawaban salah! Mari belajar dulu!", "error");
      setTimeout(() => {
        showMaterial();
      }, 2300);
    } else {
      showMessage(
        "Maaf, jawaban masih salah. Lanjut ke pertanyaan berikutnya.",
        "error"
      );
      setTimeout(() => {
        window.currentQuestion++;
        loadQuestion();
      }, 2300);
    }
  }
}

async function endQuiz() {
  Sound.stopBackground();
  if (window.timer) clearInterval(window.timer);

  try {
    // Cek apakah pemain sudah ada
    const { data: existingPlayer, error: checkError } = await window._supabase
      .from("scores")
      .select("*")
      .eq("name", window.playerName)
      .single();

    console.log("Existing player:", existingPlayer);
    console.log("New score:", window.score);

    if (existingPlayer) {
      // Update score tanpa memeriksa apakah lebih tinggi atau tidak
      const { error: updateError } = await window._supabase
        .from("scores")
        .update({
          score: window.score,
          created_at: new Date().toISOString(),
        })
        .eq("id", existingPlayer.id);

      if (updateError) {
        throw updateError;
      }

      showMessage(`Score baru berhasil disimpan: ${window.score}`, "success");
    } else {
      // Jika pemain baru, insert data baru
      const { error: insertError } = await window._supabase
        .from("scores")
        .insert([
          {
            name: window.playerName,
            score: window.score,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        throw insertError;
      }

      showMessage("Score berhasil disimpan!", "success");
    }

    // Update tampilan hasil
    document.getElementById("quiz-screen").style.display = "none";
    document.getElementById("result-screen").style.display = "block";
    document.getElementById("final-name").textContent = window.playerName;
    document.getElementById("final-score").textContent = window.score;
  } catch (error) {
    console.error("Error in endQuiz:", error);
    showCustomAlert({
      title: "Error",
      message: "Gagal menyimpan score: " + error.message,
      type: "error",
    });
  }
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

function showMessage(message, type = "info") {
  showCustomAlert({
    title: type === "success" ? "Berhasil!" : "Informasi",
    message: message,
    type: type,
  });
}

function startTimer() {
  let timeLeft = 30; // 30 detik per soal
  const timerDisplay = document.getElementById("timer");

  // Clear timer sebelumnya jika ada
  if (window.timer) clearInterval(window.timer);

  window.timer = setInterval(() => {
    timeLeft--;

    // Format tampilan timer
    timerDisplay.textContent =
      timeLeft < 10 ? `0:0${timeLeft}` : `0:${timeLeft}`;

    // Tambahkan class warning ketika waktu hampir habis (10 detik terakhir)
    if (timeLeft <= 10) {
      timerDisplay.classList.add("timer-warning");
    }

    // Jika waktu habis
    if (timeLeft <= 0) {
      clearInterval(window.timer);
      showCustomAlert({
        title: "Waktu Habis!",
        message: "Waktumu untuk soal ini telah habis!",
        type: "warning",
        buttons: [
          {
            text: "Lanjut",
            type: "primary",
            onClick: () => {
              closeCustomAlert();
              window.currentQuestion++;
              loadQuestion();
            },
          },
        ],
      });
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
  window.currentQuestion = 0;
  window.score = 0;
  document.getElementById("result-screen").style.display = "none";
  document.getElementById("welcome-screen").style.display = "block";
  document.getElementById("player-name").value = "";
}

// Fungsi untuk memulai game setelah konfirmasi
function startGame() {
  Sound.playClick();
  const inputName = document.getElementById("player-name").value;
  if (!inputName) {
    showCustomAlert({
      title: "Error",
      message: "Nama tidak boleh kosong!",
      type: "error",
    });
    return;
  }

  window.playerName = inputName;
  window.currentQuestion = 0;
  window.score = 0;
  window.retryAttempts = {};

  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("quiz-screen").style.display = "block";

  document.getElementById("total-questions").textContent = questions.length;

  loadQuestion();
  startTimer();
  Sound.startBackground();
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

// Fungsi untuk testing result screen
function showTestResult() {
  // Sembunyikan screen lain
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("quiz-screen").style.display = "none";

  // Tambahkan class untuk container
  document.querySelector(".container").classList.add("result-active");

  // Tampilkan result screen
  const resultScreen = document.getElementById("result-screen");
  resultScreen.style.display = "block";

  // Isi dengan data test
  resultScreen.innerHTML = `
        <div class="result-header">
            <h2 class="result-title">Quiz Selesai!</h2>
            <div class="result-score">80</div>
        </div>
        <div class="result-content">
            <div class="result-details">
                <div class="result-stat">
                    <span class="stat-label">Jawaban Benar</span>
                    <span class="stat-value">8/10</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Waktu</span>
                    <span class="stat-value">1:30</span>
                </div>
                <div class="result-stat">
                    <span class="stat-label">Akurasi</span>
                    <span class="stat-value">80%</span>
                </div>
            </div>
            <div class="result-actions">
                <button class="result-btn retry-btn" onclick="startQuiz()">Main Lagi</button>
                <button class="result-btn home-btn" onclick="goToHome()">Kembali ke Home</button>
            </div>
        </div>
    `;
}

// Fungsi untuk kembali ke home
function goToHome() {
  document.getElementById("result-screen").style.display = "none";
  document.getElementById("welcome-screen").style.display = "block";
  // Hapus class result-active
  document.querySelector(".container").classList.remove("result-active");
}

// Fungsi untuk menampilkan materi pembelajaran
function showMaterial() {
  // Sembunyikan layar quiz
  document.getElementById("quiz-screen").style.display = "none";
  document.getElementById("material-screen").style.display = "block";

  // Dapatkan materi yang sesuai dengan pertanyaan saat ini
  const material = learningMaterials[window.currentQuestion];

  // Tampilkan materi dengan tombol selesai
  document.getElementById("material-screen").innerHTML = `
    <div class="material-header">
      <div class="timer-container">
        Waktu Belajar: <span id="material-timer">1:00</span>
      </div>
    </div>
    <div class="material-content">
      ${material}
    </div>
    <div class="material-footer">
      <button class="finish-study-btn" onclick="finishStudying()">
        Selesai Belajar
      </button>
    </div>
  `;

  // Mulai timer untuk materi
  startMaterialTimer();
}

// Modifikasi fungsi finishStudying
function finishStudying() {
  // Hentikan timer sementara
  if (window.materialTimer) {
    clearInterval(window.materialTimer);
  }

  // Simpan sisa waktu
  const timeLeft = getTimeLeft();

  // Tampilkan konfirmasi
  showCustomAlert({
    title: "Konfirmasi",
    message: "Apakah Anda yakin sudah memahami materinya?",
    type: "info",
    buttons: [
      {
        text: "Ya",
        type: "primary",
        onClick: () => {
          closeCustomAlert();
          // Sembunyikan materi
          document.getElementById("material-screen").style.display = "none";
          // Tampilkan kembali quiz
          document.getElementById("quiz-screen").style.display = "block";
          retryQuestion();
        },
      },
      {
        text: "Belajar Lagi",
        type: "secondary",
        onClick: () => {
          closeCustomAlert();
          // Lanjutkan timer dengan sisa waktu
          resumeMaterialTimer(timeLeft);
        },
      },
    ],
  });
}

// Fungsi untuk mendapatkan sisa waktu
function getTimeLeft() {
  const timerText = document.getElementById("material-timer").textContent;
  const [minutes, seconds] = timerText.split(":").map(Number);
  return minutes * 60 + seconds;
}

// Fungsi untuk melanjutkan timer
function resumeMaterialTimer(timeLeft) {
  const timerDisplay = document.getElementById("material-timer");

  window.materialTimer = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;

    if (timeLeft <= 0) {
      clearInterval(window.materialTimer);
      // Hapus layar materi
      document.getElementById("material-screen").style.display = "none";
      // Tampilkan kembali quiz
      document.getElementById("quiz-screen").style.display = "block";
      retryQuestion();
    }
  }, 1000);
}

// Modifikasi fungsi startMaterialTimer
function startMaterialTimer() {
  let timeLeft = 60; // 1 menit
  resumeMaterialTimer(timeLeft);
}

// Tambahkan CSS untuk tombol selesai
const materialButtonStyle = document.createElement("style");
materialButtonStyle.textContent = `
  .material-footer {
    text-align: center;
    margin-top: 20px;
    padding: 20px;
  }

  .finish-study-btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .finish-study-btn:hover {
    background-color: var(--primary-color-dark);
  }
`;
document.head.appendChild(materialButtonStyle);

// Array materi pembelajaran sesuai dengan urutan pertanyaan
const learningMaterials = [
  `<div class="material-section">
    <h3>Pengertian Keberagaman</h3>
    <p>Keragaman budaya adalah keunikan yang ada di muka bumi belahan dunia dengan banyaknya berbagai macam suku bangsa yang ada di dunia, begitu juga dengan keragaman budaya khususnya di Indonesia.</p>
    <p>Tidak dapat dipungkiri keberadaannya sendiri sehingga menghasilkan kebudayaan yang berbeda dari setiap suku bangsa khususnya di Indonesia yang berbeda dari hasil kemampuan menciptakan kebudayaannya sendiri.</p>
  </div>`,
  `<div class="material-section">
    <h3>Tarian Tradisional Jambi</h3>
    <p>Tari Sekapur Sirih adalah tarian penyambutan tamu terhormat di Jambi.</p>
    <p>Ditarikan oleh 9 penari perempuan dan 3 penari laki-laki.</p>
    <p>Menggunakan properti: cerano, daun sirih, payung, dan keris.</p>
  </div>`,
  `<div class="material-section">
    <h3>Rumah Adat Jambi</h3>
    <p>Kajang Leko adalah rumah adat khas Provinsi Jambi.</p>
    <p>Memiliki makna filosofis tentang keharmonisan dengan alam.</p>
    <p>Mencerminkan kehidupan sederhana dan hormat pada leluhur.</p>
  </div>`,
  `<div class="material-section">
    <h3>Senjata Tradisional Jambi</h3>
    <p>Keris Siginjai adalah senjata tradisional khas Provinsi Jambi.</p>
    <p>Melambangkan kehormatan, status sosial, keberanian, kekuatan, kesetiaan, kesucian, dan kearifan lokal.</p>
  </div>`,
  `<div class="material-section">
    <h3>Kuliner Khas Jambi</h3>
    <p>Tempoyak adalah makanan khas Jambi yang terbuat dari fermentasi durian.</p>
    <p>Populer di masyarakat Jambi dan disajikan pada acara-acara khusus.</p>
  </div>`,
  `<div class="material-section">
    <h3>Tari Sekapur Sirih</h3>
    <p>Tari Sekapur Sirih ditarikan oleh 9 penari perempuan dan 3 penari laki-laki.</p>
    <p>Merupakan tarian penyambutan tamu kehormatan di Provinsi Jambi.</p>
  </div>`,
  `<div class="material-section">
    <h3>Pelestarian Budaya</h3>
    <p>Melarang penggunaan bahasa daerah bertentangan dengan upaya pelestarian budaya.</p>
    <p>Pemerintah harus mendukung penggunaan dan pelestarian bahasa daerah.</p>
  </div>`,
  `<div class="material-section">
    <h3>Pengertian Budaya</h3>
    <p>Budaya mencakup semua hasil cipta, rasa, dan karsa manusia termasuk adat istiadat, tradisi, seni, dan nilai-nilai.</p>
  </div>`,
  `<div class="material-section">
    <h3>Suku-suku di Jambi</h3>
    <p>Melayu Jambi, Suku Anak Dalam, dan Kerinci adalah suku-suku yang ada di Provinsi Jambi.</p>
    <p>Setiap suku memiliki keunikan budaya dan tradisinya masing-masing.</p>
  </div>`,
  `<div class="material-section">
    <h3>Baju Adat Jambi</h3>
    <p>Baju adat Jambi terkenal dengan sulaman benang emasnya yang indah.</p>
    <p>Mencerminkan keanggunan dan kekayaan budaya Melayu Jambi.</p>
  </div>`,
];

// Tambahkan CSS untuk styling materi
const materialStyle = document.createElement("style");
materialStyle.textContent = `
  .material-section {
    background: #fff;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .material-section h3 {
    color: #2c3e50;
    margin-bottom: 15px;
  }

  .material-section p {
    color: #34495e;
    line-height: 1.6;
    margin-bottom: 10px;
  }
`;
document.head.appendChild(materialStyle);

// Modifikasi fungsi retryQuestion
function retryQuestion() {
  showMessage("Silakan coba jawab pertanyaan ini sekali lagi!", "info");
  loadQuestion(); // Load ulang pertanyaan yang sama
}

// Tambahkan fungsi untuk format waktu (bisa digunakan di tempat lain jika perlu)
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}
