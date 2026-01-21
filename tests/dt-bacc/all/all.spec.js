
import { test } from "@playwright/test";
import { suffleArray } from "../../utils/helper.utils";

test('DT Baccarat Complete Flow', async ({ page }) => {
  await page.goto('http://192.168.40.235:3001/#/longhu-baccarat-display');
  const round = process.env.DT_BACCARAT_ROUND || 500;

  const testCases = [
    // small dragon
    { result: '5', resultBanker: '0', resultPlayer: '7' },
    { result: '5', resultBanker: '1', resultPlayer: '7' },
    { result: '5', resultBanker: '2', resultPlayer: '7' },
    { result: '5', resultBanker: '3', resultPlayer: '7' },
    { result: '5', resultBanker: '4', resultPlayer: '7' },
    { result: '5', resultBanker: '5', resultPlayer: '7' },
    // big dragon
    { result: '9', resultBanker: '0', resultPlayer: '7' },
    { result: '9', resultBanker: '1', resultPlayer: '7' },
    { result: '9', resultBanker: '2', resultPlayer: '7' },
    { result: '9', resultBanker: '3', resultPlayer: '7' },
    { result: '9', resultBanker: '4', resultPlayer: '7' },
    { result: '9', resultBanker: '5', resultPlayer: '7' },
    // Big tiger
    { result: '7', resultBanker: '6', resultPlayer: '0' },
    { result: '7', resultBanker: '6', resultPlayer: '1' },
    { result: '7', resultBanker: '6', resultPlayer: '2' },
    { result: '7', resultBanker: '6', resultPlayer: '3' },
    { result: '7', resultBanker: '6', resultPlayer: '4' },
    { result: '7', resultBanker: '6', resultPlayer: '5' },
    // Small tiger
    { result: '0', resultBanker: '6', resultPlayer: '0' },
    { result: '0', resultBanker: '6', resultPlayer: '1' },
    { result: '0', resultBanker: '6', resultPlayer: '2' },
    { result: '0', resultBanker: '6', resultPlayer: '3' },
    { result: '0', resultBanker: '6', resultPlayer: '4' },
    { result: '0', resultBanker: '6', resultPlayer: '5' },
    // Small tiger
    { result: '99', resultBanker: '6', resultPlayer: '7' },
    // Tiger tie
    { result: '8', resultBanker: '6', resultPlayer: '6' },
    // Tie
    { result: '2', resultBanker: '0', resultPlayer: '0' },
    { result: '2', resultBanker: '1', resultPlayer: '1' },
    { result: '2', resultBanker: '2', resultPlayer: '2' },
    { result: '2', resultBanker: '3', resultPlayer: '3' },
    { result: '2', resultBanker: '4', resultPlayer: '4' },
    { result: '2', resultBanker: '5', resultPlayer: '5' },
    { result: '2', resultBanker: '7', resultPlayer: '7' },
    { result: '2', resultBanker: '8', resultPlayer: '8' },
    { result: '2', resultBanker: '9', resultPlayer: '9' },
    // Player
    { result: '3', resultBanker: '0', resultPlayer: '1' },
    { result: '3', resultBanker: '1', resultPlayer: '2' },
    { result: '3', resultBanker: '2', resultPlayer: '3' },
    { result: '3', resultBanker: '3', resultPlayer: '4' },
    { result: '3', resultBanker: '4', resultPlayer: '5' },
    { result: '3', resultBanker: '5', resultPlayer: '6' },
    { result: '3', resultBanker: '6', resultPlayer: '8' },
    { result: '3', resultBanker: '7', resultPlayer: '8' },
    { result: '3', resultBanker: '8', resultPlayer: '9' },
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
  for (const result of suffleArray(testCases)) {
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