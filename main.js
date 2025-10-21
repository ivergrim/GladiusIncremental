const coinCounter = document.getElementById('coin-counter');
const fightButton = document.getElementById('fight-btn');
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryEffects = document.getElementById('inventory-effects');
const inventoryItemsList = document.getElementById('inventory-items');
const shopPanel = document.getElementById('shop-panel');
const shopEmptyMessage = document.getElementById('shop-empty');

const SHOP_ITEMS = [
    {
        id: 'wooden-club',
        name: 'Wooden club',
        storageKey: 'owned_wooden_club',
        cost: 5,
        description: 'Fight 10% faster.',
        type: 'speed',
        speedMultiplier: 0.9
    },
    {
        id: 'spiky-club',
        name: 'Spiky club',
        storageKey: 'owned_spiky_club',
        cost: 10,
        description: 'Fight an additional 10% faster.',
        type: 'speed',
        speedMultiplier: 0.9
    },
    {
        id: 'one-leaf-clover',
        name: 'One-leaf clover',
        storageKey: 'owned_one_leaf_clover',
        cost: 10,
        description: '10% chance to gain +1 extra coin.',
        type: 'loot',
        bonusChance: 0.1
    }
];

const shopDom = {};
SHOP_ITEMS.forEach((item) => {
    shopDom[item.id] = {
        row: document.querySelector(`[data-item="${item.id}"]`),
        button: document.getElementById(`${item.id}-btn`)
    };
});

const BASE_FIGHT_DURATION_MS = 4000;
const SHOP_UNLOCK_THRESHOLD = 5;
const INVENTORY_UNLOCK_KEY = 'inventory_unlocked';
const SHOP_UNLOCK_KEY = 'shop_unlocked';

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

function loadOwned(storageKey) {
    return localStorage.getItem(storageKey) === 'true';
}

function saveOwned(storageKey, value) {
    localStorage.setItem(storageKey, value ? 'true' : 'false');
}

function loadInventoryUnlocked() {
    return localStorage.getItem(INVENTORY_UNLOCK_KEY) === 'true';
}

function saveInventoryUnlocked(value) {
    localStorage.setItem(INVENTORY_UNLOCK_KEY, value ? 'true' : 'false');
}

function loadShopUnlocked() {
    return localStorage.getItem(SHOP_UNLOCK_KEY) === 'true';
}

function saveShopUnlocked(value) {
    localStorage.setItem(SHOP_UNLOCK_KEY, value ? 'true' : 'false');
}

let coins = loadCoins();
const ownedState = {};
SHOP_ITEMS.forEach((item) => {
    ownedState[item.id] = loadOwned(item.storageKey);
});
let inventoryUnlocked = loadInventoryUnlocked();
let shopUnlocked = loadShopUnlocked();
let fightStartTime = null;
let isFighting = false;
let activeFightDuration = calculateFightDuration();

function isItemOwned(item) {
    return Boolean(ownedState[item.id]);
}

function setItemOwned(item, value) {
    ownedState[item.id] = value;
    saveOwned(item.storageKey, value);
}

function updateCounter() {
    coinCounter.textContent = coins;
}

function updateShopItems() {
    SHOP_ITEMS.forEach((item) => {
        const dom = shopDom[item.id];
        if (!dom) {
            return;
        }

        if (isItemOwned(item)) {
            if (dom.row) {
                dom.row.remove();
                dom.row = null;
            }
            if (dom.button) {
                dom.button.disabled = true;
                dom.button = null;
            }
            return;
        }

        const available = coins >= item.cost;
        if (dom.row) {
            dom.row.hidden = !available;
        }
        if (dom.button) {
            dom.button.disabled = !available;
            dom.button.textContent = `${item.cost} coins`;
            dom.button.setAttribute('aria-label', `Buy ${item.name} for ${item.cost} coins`);
        }
    });

    updateEmptyState();
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

function unlockShopIfEligible() {
    if (shopUnlocked) {
        return;
    }

    if (coins >= SHOP_UNLOCK_THRESHOLD) {
        shopUnlocked = true;
        saveShopUnlocked(true);
    }
}

function ensureInventoryUnlocked() {
    if (inventoryUnlocked) {
        return;
    }

    const anyOwned = SHOP_ITEMS.some((item) => isItemOwned(item));
    if (anyOwned) {
        inventoryUnlocked = true;
        saveInventoryUnlocked(true);
    }
}

function updateInventoryDisplay() {
    if (!inventoryPanel || !inventoryItemsList || !inventoryEffects) {
        return;
    }

    ensureInventoryUnlocked();

    const ownedItems = SHOP_ITEMS.filter((item) => isItemOwned(item));
    const speedItemCount = ownedItems.filter((item) => item.type === 'speed').length;
    const lootItem = SHOP_ITEMS.find((item) => item.type === 'loot' && isItemOwned(item));

    inventoryEffects.innerHTML = '';

    if (speedItemCount > 0) {
        const speedLine = document.createElement('p');
        speedLine.className = 'inventory-effect-line';
        speedLine.textContent = `Fight speed: +${speedItemCount * 10}%`;
        inventoryEffects.appendChild(speedLine);
    }

    if (lootItem) {
        const lootPercent = Math.round((lootItem.bonusChance || 0) * 100);
        if (lootPercent > 0) {
            const lootLine = document.createElement('p');
            lootLine.className = 'inventory-effect-line';
            lootLine.textContent = `Double-loot chance: ${lootPercent}%`;
            inventoryEffects.appendChild(lootLine);
        }
    }

    inventoryItemsList.innerHTML = '';

    if (ownedItems.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'inventory-empty-item';
        emptyItem.textContent = 'None';
        inventoryItemsList.appendChild(emptyItem);
    } else {
        ownedItems.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'inventory-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'inventory-item-name';
            nameSpan.textContent = item.name;

            const description = document.createElement('p');
            description.className = 'inventory-item-description';
            description.textContent = item.description;

            li.appendChild(nameSpan);
            li.appendChild(description);
            inventoryItemsList.appendChild(li);
        });
    }

    if (inventoryPanel) {
        inventoryPanel.hidden = !inventoryUnlocked;
    }
}

function calculateFightDuration() {
    return SHOP_ITEMS.reduce((duration, item) => {
        if (item.type === 'speed' && isItemOwned(item)) {
            const modifier = typeof item.speedMultiplier === 'number' ? item.speedMultiplier : 1;
            return duration * modifier;
        }
        return duration;
    }, BASE_FIGHT_DURATION_MS);
}

function currentLootBonusChance() {
    const lootItem = SHOP_ITEMS.find((item) => item.type === 'loot' && isItemOwned(item));
    return lootItem ? lootItem.bonusChance || 0 : 0;
}

function setProgress(value) {
    fightButton.style.setProperty('--progress', String(value));
}

function finishFight() {
    let coinsEarned = 1;
    const bonusChance = currentLootBonusChance();
    if (bonusChance > 0 && Math.random() < bonusChance) {
        coinsEarned += 1;
    }

    coins += coinsEarned;
    saveCoins();
    updateCounter();
    unlockShopIfEligible();
    updateShopItems();
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
    activeFightDuration = calculateFightDuration();
    setProgress(0);
    fightStartTime = null;
    requestAnimationFrame(stepFight);
}

function initialize() {
    updateCounter();
    ensureInventoryUnlocked();
    unlockShopIfEligible();
    updateShopItems();
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

SHOP_ITEMS.forEach((item) => {
    const dom = shopDom[item.id];
    if (!dom || !dom.button) {
        return;
    }

    dom.button.addEventListener('click', () => {
        if (isItemOwned(item) || coins < item.cost) {
            return;
        }

        coins -= item.cost;
        saveCoins();
        setItemOwned(item, true);
        ensureInventoryUnlocked();
        unlockShopIfEligible();
        updateCounter();
        updateShopItems();
        updateShopVisibility();
        updateInventoryDisplay();
        activeFightDuration = calculateFightDuration();
    });
});
