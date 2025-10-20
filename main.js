const coinCounter = document.getElementById("coin-counter");
const fightButton = document.getElementById("fight-btn");

let coins = 0;

function updateCounter() {
  coinCounter.textContent = `Coins: ${coins}`;
}

fightButton.addEventListener("click", () => {
  coins += 1;
  updateCounter();
});
