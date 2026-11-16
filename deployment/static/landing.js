const countdown = document.getElementById("countdown");
const updateCountdown = () => {
  const remaining = Number(countdown.dataset.start) - Date.now();
  countdown.textContent =
    remaining > 0
      ? `${Math.floor(remaining / 86400000)} dias · ${Math.floor(remaining / 3600000) % 24} horas`
      : "Novidades sobre a próxima edição em breve.";
};
updateCountdown();
setInterval(updateCountdown, 60000);
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
