
import { test } from "@playwright/test";

test('DT Baccarat Banker Flow', async ({ page }) => {
  await page.goto('http://192.168.40.235:3001/#/longhu-baccarat-display');
    const round = process.env.DT_BACCARAT_ROUND || 500;

  const testCases = [
    // Banker
    { result: '1', resultBanker: '1', resultPlayer: '0' },
    { result: '1', resultBanker: '2', resultPlayer: '1' },
    { result: '1', resultBanker: '3', resultPlayer: '2' },
    { result: '1', resultBanker: '4', resultPlayer: '3' },
    { result: '1', resultBanker: '5', resultPlayer: '4' },
    { result: '1', resultBanker: '7', resultPlayer: '5' },
    { result: '1', resultBanker: '7', resultPlayer: '6' },
    { result: '1', resultBanker: '8', resultPlayer: '7' },
    { result: '1', resultBanker: '9', resultPlayer: '8' },

      // Banker banker pair
    { result: '14', resultBanker: '1', resultPlayer: '0' },
    { result: '14', resultBanker: '2', resultPlayer: '1' },
    { result: '14', resultBanker: '3', resultPlayer: '2' },
    { result: '14', resultBanker: '4', resultPlayer: '3' },
    { result: '14', resultBanker: '5', resultPlayer: '4' },
    { result: '14', resultBanker: '7', resultPlayer: '5' },
    { result: '14', resultBanker: '7', resultPlayer: '6' },
    { result: '14', resultBanker: '8', resultPlayer: '7' },
    { result: '14', resultBanker: '9', resultPlayer: '8' },

      // Banker player pair
    { result: '16', resultBanker: '1', resultPlayer: '0' },
    { result: '16', resultBanker: '2', resultPlayer: '1' },
    { result: '16', resultBanker: '3', resultPlayer: '2' },
    { result: '16', resultBanker: '4', resultPlayer: '3' },
    { result: '16', resultBanker: '5', resultPlayer: '4' },
    { result: '16', resultBanker: '7', resultPlayer: '5' },
    { result: '16', resultBanker: '7', resultPlayer: '6' },
    { result: '16', resultBanker: '8', resultPlayer: '7' },
    { result: '16', resultBanker: '9', resultPlayer: '8' },

      // Banker banker, player pair
    { result: '146', resultBanker: '1', resultPlayer: '0' },
    { result: '146', resultBanker: '2', resultPlayer: '1' },
    { result: '146', resultBanker: '3', resultPlayer: '2' },
    { result: '146', resultBanker: '4', resultPlayer: '3' },
    { result: '146', resultBanker: '5', resultPlayer: '4' },
    { result: '146', resultBanker: '7', resultPlayer: '5' },
    { result: '146', resultBanker: '7', resultPlayer: '6' },
    { result: '146', resultBanker: '8', resultPlayer: '7' },
    { result: '146', resultBanker: '9', resultPlayer: '8' },

  ];

  // Optional: log viewport size
  const viewport = page.viewportSize();
  if (viewport) {
    console.log(`Width: ${viewport.width}, Height: ${viewport.height}`);
  }
  await page.waitForTimeout(3000);
  const startButton = page.locator('button:has-text("START")');
  const stopButton = page.locator('button:has-text("STOP")');

  // Determine which button is currently visible
  if (await startButton.isVisible()) {
    console.log("START button visible, starting the game...");
    await startButton.click();
    await page.waitForTimeout(2000);

    for (let index = 0; index < round; index++) {
      await GameRound(testCases, index + 1, page);
      await ShoeChange(page);
    }


    await stopButton.click();

  } else if (await stopButton.isVisible()) {
    console.log("STOP button visible. Stopping first...");
    await stopButton.click();
    await page.waitForTimeout(2000);
    await startButton.click();
    await page.waitForTimeout(2000);

    for (let index = 0; index < round; index++) {
      await GameRound(testCases, index + 1, page);
      await ShoeChange(page);
    }



    if (stopButton.isVisible())
      await stopButton.click();
    console.log("Flow completed: STOP -> START -> STOP");
  } else {
    console.log("Neither START nor STOP buttons are found.");
  }


});

async function GameRound(testCases, roundNumber, page) {
  console.log(`✅ Iteration ${roundNumber} started.`);
  for (const result of testCases) {
    console.log(`Executing: result=${result.result}, banker=${result.resultBanker}, player=${result.resultPlayer}`);
    await TestCaseExecution(page, result.result, result.resultBanker, result.resultPlayer);
  }
  console.log(`✅ Iteration ${roundNumber} completed.`);
}

async function TestCaseExecution(page, result, num1, num2) {

  // Operation steps 

  await page.locator('body').pressSequentially('**');
  await page.waitForTimeout(1000);

  await page.locator('body').press('Enter');

  await page.locator('body').pressSequentially('//');
  await page.waitForTimeout(1000);

  await page.locator('body').press('Enter');
  await page.waitForTimeout(1000);

  await page.locator('body').pressSequentially(result);
  await page.waitForTimeout(1000);
  await page.locator('body').press('.');
  await page.waitForTimeout(1000);
  await page.locator('body').press(num1);
  await page.waitForTimeout(1000);
  await page.locator('body').press('.');
  await page.waitForTimeout(1000);
  await page.locator('body').press(num2);
  await page.waitForTimeout(1000);
  await page.locator('body').press('Enter');
  await page.waitForTimeout(10000);
}

async function ShoeChange(page) {
  await page.locator('body').pressSequentially('++');
  await page.waitForTimeout(1000);
  await page.locator('body').press('Enter');
  await page.getByRole('textbox').click();
  await page.waitForTimeout(500);
  await page.getByRole('textbox').fill('123');
  await page.waitForTimeout(500);
  await page.getByRole('textbox').press('Enter');
  await page.waitForTimeout(5000);
}