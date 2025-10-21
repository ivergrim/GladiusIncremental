const coinCounter = document.getElementById('coin-counter');
const fightButton = document.getElementById('fight-btn');
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryEffects = document.getElementById('inventory-effects');
const inventoryItemsList = document.getElementById('inventory-items');
const shopPanel = document.getElementById('shop-panel');
const shopEmptyMessage = document.getElementById('shop-empty');

const ALL_ITEMS = [
    {
        key: 'owned_wooden_club',
        name: 'Wooden club',
        price: 5,
        description: 'Fight 10% faster.',
        effects: { speedMultiplier: 0.9 }
    },
    {
        key: 'owned_spiky_club',
        name: 'Spiky club',
        price: 10,
        description: 'Fight an additional 10% faster.',
        effects: { speedMultiplier: 0.9 }
    },
    {
        key: 'owned_one_leaf_clover',
        name: 'One-leaf clover',
        price: 10,
        description: '10% chance to gain +1 extra coin.',
        effects: { doubleLootChance: 0.1 }
    }
];

let coins = Number(localStorage.getItem('coins')) || 0;
const owned = {};
ALL_ITEMS.forEach((item) => {
    owned[item.key] = localStorage.getItem(item.key) === 'true';
});

const INVENTORY_UNLOCK_KEY = 'inventory_unlocked';
const SHOP_UNLOCK_KEY = 'shop_unlocked';
let inventoryUnlocked = localStorage.getItem(INVENTORY_UNLOCK_KEY) === 'true';
let shopUnlocked = localStorage.getItem(SHOP_UNLOCK_KEY) === 'true';

const BASE_FIGHT_DURATION_MS = 4000;
const SHOP_UNLOCK_THRESHOLD = 5;
let fightStartTime = null;
let isFighting = false;
let activeFightDuration = calculateFightDuration();

fightButton.addEventListener('click', () => {
    if (fightButton.disabled) {
        return;
    }

    startFight();
});

render();

function ensureInventoryUnlocked() {
    if (inventoryUnlocked) {
        return;
    }

    const anyOwned = ALL_ITEMS.some((item) => owned[item.key]);
    if (anyOwned) {
        inventoryUnlocked = true;
        localStorage.setItem(INVENTORY_UNLOCK_KEY, 'true');
    }
}

function unlockShopIfEligible() {
    if (shopUnlocked) {
        return;
    }

    if (coins >= SHOP_UNLOCK_THRESHOLD) {
        shopUnlocked = true;
        localStorage.setItem(SHOP_UNLOCK_KEY, 'true');
    }
}

function render() {
    unlockShopIfEligible();
    ensureInventoryUnlocked();
    updateCoinDisplay();
    renderShop();
    renderInventory();
    fightButton.disabled = isFighting;
}

function updateCoinDisplay() {
    if (!coinCounter) {
        return;
    }

    coinCounter.textContent = coins;
}

function renderShop() {
    if (!shopPanel) {
        return;
    }

    const shopList =
        shopPanel.querySelector('.shop-items') || document.getElementById('shop-list');
    if (!shopList) {
        return;
    }

    shopList.innerHTML = '';

    const visibleItems = ALL_ITEMS.filter((item) => !owned[item.key] && coins >= item.price);

    visibleItems.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'shop-item';
        li.dataset.key = item.key;

        const textWrapper = document.createElement('div');
        textWrapper.className = 'shop-item-text';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;

        const description = document.createElement('p');
        description.className = 'item-description';
        description.textContent = item.description;

        textWrapper.appendChild(nameSpan);
        textWrapper.appendChild(description);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'shop-buy-btn';
        button.dataset.key = item.key;
        button.textContent = `${item.price} coins`;
        button.setAttribute('aria-label', `Buy ${item.name} for ${item.price} coins`);
        button.addEventListener('click', () => buyItem(item.key));

        li.appendChild(textWrapper);
        li.appendChild(button);
        shopList.appendChild(li);
    });

    if (shopEmptyMessage) {
        shopEmptyMessage.hidden = visibleItems.length > 0;
    }

    const shouldShowPanel = shopUnlocked || coins >= SHOP_UNLOCK_THRESHOLD || visibleItems.length > 0;
    shopPanel.hidden = !shouldShowPanel;
}

function buyItem(key) {
    const item = ALL_ITEMS.find((entry) => entry.key === key);
    if (!item) {
        return;
    }
    if (owned[key]) {
        return;
    }
    if (coins < item.price) {
        return;
    }

    coins -= item.price;
    owned[key] = true;
    localStorage.setItem('coins', String(coins));
    localStorage.setItem(key, 'true');
    render();
}

function renderInventory() {
    if (!inventoryPanel || !inventoryItemsList || !inventoryEffects) {
        return;
    }

    const ownedItems = ALL_ITEMS.filter((item) => owned[item.key]);

    const totals = ownedItems.reduce(
        (acc, item) => {
            const effects = item.effects || {};
            if (typeof effects.speedMultiplier === 'number') {
                acc.speedPercent += Math.round((1 - effects.speedMultiplier) * 100);
            }
            if (typeof effects.doubleLootChance === 'number') {
                acc.doubleLootChance += effects.doubleLootChance;
            }
            return acc;
        },
        { speedPercent: 0, doubleLootChance: 0 }
    );

    inventoryEffects.innerHTML = '';

    if (totals.speedPercent > 0) {
        const speedLine = document.createElement('p');
        speedLine.className = 'inventory-effect-line';
        speedLine.textContent = `Fight speed: +${totals.speedPercent}%`;
        inventoryEffects.appendChild(speedLine);
    }

    const doubleLootPercent = Math.round(Math.min(totals.doubleLootChance, 1) * 100);
    if (doubleLootPercent > 0) {
        const lootLine = document.createElement('p');
        lootLine.className = 'inventory-effect-line';
        lootLine.textContent = `Double-loot chance: ${doubleLootPercent}%`;
        inventoryEffects.appendChild(lootLine);
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

    inventoryPanel.hidden = !inventoryUnlocked;
}

function calculateFightDuration() {
    return ALL_ITEMS.reduce((duration, item) => {
        const effects = item.effects || {};
        if (owned[item.key] && typeof effects.speedMultiplier === 'number') {
            return duration * effects.speedMultiplier;
        }
        return duration;
    }, BASE_FIGHT_DURATION_MS);
}

function currentLootBonusChance() {
    return Math.min(
        ALL_ITEMS.reduce((total, item) => {
            const effects = item.effects || {};
            if (owned[item.key] && typeof effects.doubleLootChance === 'number') {
                return total + effects.doubleLootChance;
            }
            return total;
        }, 0),
        1
    );
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
    localStorage.setItem('coins', String(coins));
    unlockShopIfEligible();
    ensureInventoryUnlocked();

    isFighting = false;
    setProgress(0);
    fightStartTime = null;
    render();
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
    activeFightDuration = calculateFightDuration();
    setProgress(0);
    fightStartTime = null;
    render();
    requestAnimationFrame(stepFight);
}
