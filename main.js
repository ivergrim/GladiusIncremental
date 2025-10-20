const coinCounter = document.getElementById('coin-counter');
const fightButton = document.getElementById('fight-btn');

function loadCoins() {
  const storedValue = localStorage.getItem('coins');
  if (storedValue === null) return 0;
  const parsedValue = Number(storedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

let coins = loadCoins();

function updateCounter() {
  coinCounter.textContent = `Coins: ${coins}`;
}

function saveCoins() {
  localStorage.setItem('coins', String(coins));
}

updateCounter();

fightButton.addEventListener('click', () => {
  coins += 1;
  updateCounter();
  saveCoins();
});
