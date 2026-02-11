import { test } from "@playwright/test";

// Config codes for Niu Niu hand types
const CONFIG = {
  codes: {
    FIVE_TIGERS: '88',
    FIVE_SMALL: '89',
    BOMB: '87',
    NIU_NIU: '99',
    NO_NIU: '00'
  }
};

// Predefined deterministic test cases to cover all scenarios
const testCases = [];

// ===== SPECIAL HANDS =====
const specialHands = [
  CONFIG.codes.FIVE_TIGERS,
  CONFIG.codes.FIVE_SMALL,
  CONFIG.codes.BOMB,
  CONFIG.codes.NIU_NIU,
  CONFIG.codes.NO_NIU
];

// For each hand type, cover banker vs player outcomes 0–10
specialHands.forEach(hand => {
  for (let banker = 0; banker <= 10; banker++) {
    for (let player = 0; player <= 10; player++) {
      // Skip invalid combos for special hands
      if ((hand === CONFIG.codes.FIVE_TIGERS && banker < 10 && player < 10) ||
          (hand === CONFIG.codes.FIVE_SMALL && banker > 5 && player > 5) ||
          (hand === CONFIG.codes.BOMB && banker === player && banker !== 10)) {
        continue;
      }
      testCases.push({
        result: hand,
        resultBanker: banker.toString(),
        resultPlayer: player.toString()
      });
    }
  }
});

// Add Niu 9–1 outcomes
for (let niu = 9; niu >= 1; niu--) {
  for (let banker = 0; banker <= 10; banker++) {
    for (let player = 0; player <= 10; player++) {
      testCases.push({
        result: niu.toString(),
        resultBanker: banker.toString(),
        resultPlayer: player.toString()
      });
    }
  }
}

// ===== Playwright Test =====
test('DT Niu Niu Complete Deterministic Flow', async ({ page }) => {
  await page.goto('http://192.168.40.235:3001/#/niu-niu-display');
  const round = process.env.NIU_NIU_ROUND || 500;

  await page.waitForTimeout(3000);
  const startButton = page.locator('button:has-text("START")');
  const stopButton = page.locator('button:has-text("STOP")');

  if (await startButton.isVisible()) {
    console.log("START button visible, starting the game...");
    await startButton.click();
    await page.waitForTimeout(2000);

    for (let r = 1; r <= round; r++) {
      console.log(`✅ Round ${r} started.`);

      for (const tc of testCases) {
        console.log(`Executing: result=${tc.result}, banker=${tc.resultBanker}, player=${tc.resultPlayer}`);
        await TestCaseExecution(page, tc.result, tc.resultBanker, tc.resultPlayer);
      }

      await ShoeChange(page);
      console.log(`✅ Round ${r} completed.`);
    }

    await stopButton.click();

  } else if (await stopButton.isVisible()) {
    await stopButton.click();
    await page.waitForTimeout(2000);
    await startButton.click();
    await page.waitForTimeout(2000);

    for (let r = 1; r <= round; r++) {
      for (const tc of testCases) {
        await TestCaseExecution(page, tc.result, tc.resultBanker, tc.resultPlayer);
      }
      await ShoeChange(page);
    }

    if (await stopButton.isVisible()) await stopButton.click();
    console.log("Flow completed: STOP -> START -> STOP");
  } else {
    console.log("Neither START nor STOP button found.");
  }
});

// Execute input sequence
async function TestCaseExecution(page, result, banker, player) {
  await page.locator('body').pressSequentially('**');
  await page.waitForTimeout(1000);
  await page.locator('body').press('Enter');

  await page.locator('body').pressSequentially('//');
  await page.waitForTimeout(1000);
  await page.locator('body').press('Enter');

  await page.locator('body').pressSequentially(result);
  await page.waitForTimeout(500);
  await page.locator('body').press('.');
  await page.waitForTimeout(500);
  await page.locator('body').press(banker);
  await page.waitForTimeout(500);
  await page.locator('body').press('.');
  await page.waitForTimeout(500);
  await page.locator('body').press(player);
  await page.waitForTimeout(500);

  await page.locator('body').press('Enter');
  await page.waitForTimeout(10000);
}

// Shoe change sequence
async function ShoeChange(page) {
  await page.locator('body').pressSequentially('++');
  await page.waitForTimeout(1000);
  await page.locator('body').press('Enter');

  const textbox = page.getByRole('textbox');
  if (await textbox.count() > 0) {
    await textbox.click();
    await page.waitForTimeout(500);
    await textbox.fill('123');
    await page.waitForTimeout(500);
    await textbox.press('Enter');
    await page.waitForTimeout(5000);
  }
}
