const coinCounter = document.getElementById('coin-counter');
const fightButton = document.getElementById('fight-btn');
const shopPanel = document.getElementById('shop-panel');
const woodenClubButton = document.getElementById('wooden-club-btn');
let woodenClubItem = document.querySelector('[data-item="wooden-club"]');
const shopEmptyMessage = document.getElementById('shop-empty');

const BASE_FIGHT_DURATION_MS = 4000;
const WOODEN_CLUB_DURATION_MS = 3600;
const WOODEN_CLUB_COST = 5;
const SHOP_UNLOCK_THRESHOLD = 5;

function loadCoins() {
    const storedValue = localStorage.getItem('coins');
    if (storedValue === null) {
        return 0;
    }

    const parsedValue = Number(storedValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function saveCoins() {
    localStorage.setItem('coins', String(coins));
}

function loadWoodenClubOwned() {
    return localStorage.getItem('owned_wooden_club') === 'true';
}

function saveWoodenClubOwned(value) {
    localStorage.setItem('owned_wooden_club', value ? 'true' : 'false');
}

function loadShopUnlocked() {
    return localStorage.getItem('shop_unlocked') === 'true';
}

function saveShopUnlocked(value) {
    localStorage.setItem('shop_unlocked', value ? 'true' : 'false');
}

let coins = loadCoins();
let woodenClubOwned = loadWoodenClubOwned();
let shopUnlocked = loadShopUnlocked();
let fightStartTime = null;
let isFighting = false;
let activeFightDuration = BASE_FIGHT_DURATION_MS;

function updateCounter() {
    coinCounter.textContent = coins;
}

function updateShopVisibility() {
    if (!shopPanel) {
        return;
    }

    const hasVisibleItems = Boolean(shopPanel.querySelector('.shop-item:not([hidden])'));
    const shouldShow = shopUnlocked || coins >= SHOP_UNLOCK_THRESHOLD || hasVisibleItems;
    shopPanel.hidden = !shouldShow;
}

function updateWoodenClubItem() {
    if (woodenClubOwned) {
        if (woodenClubItem && woodenClubItem.parentElement) {
            woodenClubItem.remove();
        }
        woodenClubItem = null;
        if (woodenClubButton) {
            woodenClubButton.disabled = true;
        }
        updateEmptyState();
        return;
    }

    if (!woodenClubItem || !woodenClubButton) {
        updateEmptyState();
        return;
    }

    const itemAvailable = coins >= WOODEN_CLUB_COST;
    woodenClubItem.hidden = !itemAvailable;
    woodenClubButton.disabled = !itemAvailable;
    woodenClubButton.textContent = `${WOODEN_CLUB_COST} coins`;
    woodenClubButton.setAttribute('aria-label', `Buy Wooden club for ${WOODEN_CLUB_COST} coins`);
    updateEmptyState();
}

function updateEmptyState() {
    if (!shopPanel || !shopEmptyMessage) {
        return;
    }

    const visibleItem = shopPanel.querySelector('.shop-item:not([hidden])');
    shopEmptyMessage.hidden = Boolean(visibleItem);
}

function unlockShopIfEligible() {
    if (shopUnlocked) {
        return;
    }

    if (coins >= SHOP_UNLOCK_THRESHOLD) {
        shopUnlocked = true;
        saveShopUnlocked(true);
    }
}

function setProgress(value) {
    fightButton.style.setProperty('--progress', String(value));
}

function finishFight() {
    coins += 1;
    saveCoins();
    updateCounter();
    unlockShopIfEligible();
    updateWoodenClubItem();
    updateShopVisibility();
    fightButton.disabled = false;
    isFighting = false;
    setProgress(0);
    fightStartTime = null;
}

function stepFight(timestamp) {
    if (fightStartTime === null) {
        fightStartTime = timestamp;
    }

    const elapsed = timestamp - fightStartTime;
    const progressRatio = Math.min(elapsed / activeFightDuration, 1);
    setProgress(progressRatio * 100);

    if (progressRatio < 1) {
        requestAnimationFrame(stepFight);
    } else {
        finishFight();
    }
}

function startFight() {
    if (isFighting) {
        return;
    }

    isFighting = true;
    fightButton.disabled = true;
    activeFightDuration = woodenClubOwned ? WOODEN_CLUB_DURATION_MS : BASE_FIGHT_DURATION_MS;
    setProgress(0);
    fightStartTime = null;
    requestAnimationFrame(stepFight);
}

function initialize() {
    updateCounter();
    unlockShopIfEligible();
    updateWoodenClubItem();
    updateShopVisibility();
}

initialize();

fightButton.addEventListener('click', () => {
    if (fightButton.disabled) {
        return;
    }

    startFight();
});

if (woodenClubButton) {
    woodenClubButton.addEventListener('click', () => {
        if (woodenClubOwned || coins < WOODEN_CLUB_COST) {
            return;
        }

        coins -= WOODEN_CLUB_COST;
        woodenClubOwned = true;
        saveCoins();
        saveWoodenClubOwned(true);
        unlockShopIfEligible();
        updateCounter();
        updateWoodenClubItem();
        updateShopVisibility();
    });
}
