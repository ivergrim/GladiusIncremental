const coinCounter = document.getElementById('coin-counter');
const fightButton = document.getElementById('fight-btn');
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryEffects = document.getElementById('inventory-effects');
const inventoryItemsList = document.getElementById('inventory-items');
const shopPanel = document.getElementById('shop-panel');
const shopEmptyMessage = document.getElementById('shop-empty');

function ensureInventorySectionOrder() {
    if (!inventoryPanel || !inventoryItemsList || !inventoryEffects) {
        return;
    }

    const itemsSection = inventoryItemsList.closest('.inventory-section');
    const effectsSection = inventoryEffects.closest('.inventory-section');

    if (
        itemsSection &&
        effectsSection &&
        (itemsSection.compareDocumentPosition(effectsSection) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    ) {
        inventoryPanel.insertBefore(itemsSection, effectsSection);
    }
}

ensureInventorySectionOrder();

const SIXTY_NINE_LEAF_KEY = 'owned_sixtynine_leaf_clover';

const ALL_ITEMS = [
    {
        key: 'owned_wooden_club',
        name: 'Wooden club',
        price: 5,
        description: 'Fight 10% faster.',
        effects: { speedMultiplier: 0.9 },
        itemType: 'Weapon'
    },
    {
        key: 'owned_spiky_club',
        name: 'Spiky club',
        price: 10,
        description: 'Fight 15% faster.',
        effects: { speedMultiplier: 0.85 },
        itemType: 'Weapon'
    },
    {
        key: 'owned_one_leaf_clover',
        name: 'One-leaf clover',
        price: 10,
        description: '10% chance to gain +1 extra coin.',
        effects: { doubleLootChance: 0.1 },
        itemType: 'Clover'
    },
    {
        key: SIXTY_NINE_LEAF_KEY,
        name: 'Sixtynine-leaf clover',
        price: 5,
        description: '50% chance to gain +100 coins per fight.',
        effects: { jackpotChance: 0.5, jackpotAmount: 100 },
        itemType: 'Clover'
    }
];

let coins = Number(localStorage.getItem('coins')) || 0;
const owned = {};
ALL_ITEMS.forEach((item) => {
    owned[item.key] = localStorage.getItem(item.key) === 'true';
});
const retired = {};
ALL_ITEMS.forEach((item) => {
    retired[item.key] = localStorage.getItem(`retired_${item.key}`) === 'true';
});
const purchaseTimestamps = {};
ALL_ITEMS.forEach((item) => {
    const stored = localStorage.getItem(`purchased_ts_${item.key}`);
    purchaseTimestamps[item.key] = stored ? Number(stored) : 0;
});

function normalizeOwnedByType() {
    const itemsByType = new Map();

    ALL_ITEMS.forEach((item) => {
        if (!owned[item.key]) {
            return;
        }

        const collection = itemsByType.get(item.itemType);
        if (collection) {
            collection.push(item);
        } else {
            itemsByType.set(item.itemType, [item]);
        }
    });

    itemsByType.forEach((items) => {
        items.sort((a, b) => {
            const tsA = purchaseTimestamps[a.key] || 0;
            const tsB = purchaseTimestamps[b.key] || 0;
            if (tsA !== tsB) {
                return tsB - tsA;
            }
            return b.price - a.price;
        });

        const keeper = items[0];
        let keeperTimestamp = purchaseTimestamps[keeper.key] || 0;
        if (!keeperTimestamp) {
            keeperTimestamp = Date.now();
            purchaseTimestamps[keeper.key] = keeperTimestamp;
            localStorage.setItem(`purchased_ts_${keeper.key}`, String(keeperTimestamp));
        }

        for (let i = 1; i < items.length; i += 1) {
            const removeCandidate = items[i];
            owned[removeCandidate.key] = false;
            localStorage.removeItem(removeCandidate.key);
            purchaseTimestamps[removeCandidate.key] = 0;
            localStorage.removeItem(`purchased_ts_${removeCandidate.key}`);
        }
    });
}

const revealed = {};
ALL_ITEMS.forEach((item) => {
    revealed[item.key] = localStorage.getItem(`revealed_${item.key}`) === 'true';
});

if (!revealed[SIXTY_NINE_LEAF_KEY]) {
    revealed[SIXTY_NINE_LEAF_KEY] = true;
    localStorage.setItem(`revealed_${SIXTY_NINE_LEAF_KEY}`, 'true');
}

normalizeOwnedByType();

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

    const ownsWoodenClub = owned['owned_wooden_club'];

    ALL_ITEMS.forEach((item) => {
        if (!revealed[item.key] && coins >= item.price) {
            revealed[item.key] = true;
            localStorage.setItem(`revealed_${item.key}`, 'true');
        }
        if (
            item.key === 'owned_spiky_club' &&
            !revealed[item.key] &&
            ownsWoodenClub
        ) {
            revealed[item.key] = true;
            localStorage.setItem(`revealed_${item.key}`, 'true');
        }
    });

    const visibleItems = ALL_ITEMS.filter((item) => {
        if (owned[item.key] || retired[item.key]) {
            return false;
        }

        if (item.key === 'owned_spiky_club') {
            return ownsWoodenClub || coins >= item.price;
        }

        if (item.key === SIXTY_NINE_LEAF_KEY) {
            return true;
        }

        return revealed[item.key] || coins >= item.price;
    });

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
        button.disabled = coins < item.price;
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

    const itemsToUnequip = ALL_ITEMS.filter(
        (other) => other.itemType === item.itemType && owned[other.key]
    );

    itemsToUnequip.forEach((equipped) => {
        owned[equipped.key] = false;
        localStorage.removeItem(equipped.key);
        purchaseTimestamps[equipped.key] = 0;
        localStorage.removeItem(`purchased_ts_${equipped.key}`);
        retired[equipped.key] = true;
        localStorage.setItem(`retired_${equipped.key}`, 'true');
    });

    coins -= item.price;
    owned[key] = true;
    localStorage.setItem('coins', String(coins));
    localStorage.setItem(key, 'true');
    const timestamp = Date.now();
    purchaseTimestamps[key] = timestamp;
    localStorage.setItem(`purchased_ts_${key}`, String(timestamp));
    activeFightDuration = calculateFightDuration();
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
            if (typeof effects.jackpotChance === 'number' && effects.jackpotChance > 0) {
                acc.jackpotChance = effects.jackpotChance;
                acc.jackpotAmount = effects.jackpotAmount || 0;
            }
            return acc;
        },
        { speedPercent: 0, doubleLootChance: 0, jackpotChance: 0, jackpotAmount: 0 }
    );

    inventoryItemsList.innerHTML = '';

    const latestPerType = {};
    ownedItems.forEach((item) => {
        const type = item.itemType || 'Unknown';
        const timestamp = purchaseTimestamps[item.key] || 0;
        if (!latestPerType[type] || timestamp > latestPerType[type].timestamp) {
            latestPerType[type] = { item, timestamp };
        }
    });

    const latestItems = Object.values(latestPerType)
        .map((entry) => entry.item)
        .sort((a, b) => {
            const tsA = purchaseTimestamps[a.key] || 0;
            const tsB = purchaseTimestamps[b.key] || 0;
            return tsB - tsA;
        });

    if (latestItems.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'inventory-empty-item';
        emptyItem.textContent = 'None';
        inventoryItemsList.appendChild(emptyItem);
    } else {
        latestItems.forEach((item) => {
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

    if (totals.jackpotChance > 0 && totals.jackpotAmount > 0) {
        const jackpotPercent = Math.round(totals.jackpotChance * 100);
        const jackpotLine = document.createElement('p');
        jackpotLine.className = 'inventory-effect-line';
        jackpotLine.textContent = `Jackpot: ${jackpotPercent}% for +${totals.jackpotAmount} coins`;
        inventoryEffects.appendChild(jackpotLine);
    }

    const itemsSection = inventoryItemsList.parentElement;
    const effectsSection = inventoryEffects.parentElement;
    const parentSection = itemsSection && effectsSection ? itemsSection.parentElement : null;
    if (
        itemsSection &&
        effectsSection &&
        parentSection &&
        itemsSection.nextElementSibling !== effectsSection
    ) {
        parentSection.insertBefore(itemsSection, effectsSection);
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

function currentJackpotEffect() {
    for (const item of ALL_ITEMS) {
        if (!owned[item.key]) {
            continue;
        }

        const effects = item.effects || {};
        if (typeof effects.jackpotChance === 'number' && effects.jackpotChance > 0) {
            return {
                jackpotChance: effects.jackpotChance,
                jackpotAmount: effects.jackpotAmount || 0
            };
        }
    }

    return null;
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

    const jackpot = currentJackpotEffect();
    if (
        jackpot &&
        jackpot.jackpotChance > 0 &&
        Math.random() < jackpot.jackpotChance &&
        jackpot.jackpotAmount > 0
    ) {
        coins += jackpot.jackpotAmount;
    }

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
