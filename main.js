const coinCounter = document.getElementById('coin-counter');
const fightButton = document.getElementById('fight-btn');
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryEffects = document.getElementById('inventory-effects');
const inventoryItemsList = document.getElementById('inventory-items');
const shopPanel = document.getElementById('shop-panel');
const woodenClubButton = document.getElementById('wooden-club-btn');
let woodenClubItem = document.querySelector('[data-item="wooden-club"]');
const shopEmptyMessage = document.getElementById('shop-empty');

const BASE_FIGHT_DURATION_MS = 4000;
const WOODEN_CLUB_DURATION_MS = 3600;
const WOODEN_CLUB_COST = 5;
const SHOP_UNLOCK_THRESHOLD = 5;
const INVENTORY_UNLOCK_KEY = 'inventory_unlocked';

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

function loadInventoryUnlocked() {
    return localStorage.getItem(INVENTORY_UNLOCK_KEY) === 'true';
}

function saveInventoryUnlocked(value) {
    localStorage.setItem(INVENTORY_UNLOCK_KEY, value ? 'true' : 'false');
}

function loadShopUnlocked() {
    return localStorage.getItem('shop_unlocked') === 'true';
}

function saveShopUnlocked(value) {
    localStorage.setItem('shop_unlocked', value ? 'true' : 'false');
}

let coins = loadCoins();
let woodenClubOwned = loadWoodenClubOwned();
let inventoryUnlocked = loadInventoryUnlocked();
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

function updateEmptyState() {
    if (!shopPanel || !shopEmptyMessage) {
        return;
    }

    const visibleItem = shopPanel.querySelector('.shop-item:not([hidden])');
    shopEmptyMessage.hidden = Boolean(visibleItem);
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

function unlockShopIfEligible() {
    if (shopUnlocked) {
        return;
    }

    if (coins >= SHOP_UNLOCK_THRESHOLD) {
        shopUnlocked = true;
        saveShopUnlocked(true);
    }
}

function updateInventoryDisplay() {
    if (!inventoryPanel || !inventoryEffects || !inventoryItemsList) {
        return;
    }

    let fightSpeedBonus = 0;
    const ownedItems = [];

    if (woodenClubOwned) {
        fightSpeedBonus += 10;
        ownedItems.push({
            name: 'Wooden club',
            description: 'Fight 10% faster.'
        });
    }

    inventoryEffects.textContent = `Fight speed: +${fightSpeedBonus}%`;

    inventoryItemsList.innerHTML = '';

    if (ownedItems.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'inventory-empty-item';
        emptyItem.textContent = 'None';
        inventoryItemsList.appendChild(emptyItem);
    } else {
        ownedItems.forEach((item) => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.className = 'inventory-item-name';
            nameSpan.textContent = item.name;
            const desc = document.createElement('p');
            desc.className = 'inventory-item-description';
            desc.textContent = item.description;
            li.appendChild(nameSpan);
            li.appendChild(desc);
            inventoryItemsList.appendChild(li);
        });
    }

    if (ownedItems.length > 0 && !inventoryUnlocked) {
        inventoryUnlocked = true;
        saveInventoryUnlocked(true);
    }

    inventoryPanel.hidden = !inventoryUnlocked;
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
    updateInventoryDisplay();
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
    if (woodenClubOwned && !inventoryUnlocked) {
        inventoryUnlocked = true;
        saveInventoryUnlocked(true);
    }
    unlockShopIfEligible();
    updateWoodenClubItem();
    updateShopVisibility();
    updateInventoryDisplay();
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
        if (!inventoryUnlocked) {
            inventoryUnlocked = true;
            saveInventoryUnlocked(true);
        }
        updateCounter();
        updateWoodenClubItem();
        updateShopVisibility();
        updateInventoryDisplay();
        activeFightDuration = WOODEN_CLUB_DURATION_MS;
    });
}
