
import { test } from "@playwright/test";
test('DT Baccarat Big Flow', async ({ page }) => {
  await page.goto('http://192.168.40.235:3001/#/longhu-baccarat-display');
    const round = process.env.DT_BACCARAT_ROUND || 500;

  const testCases = [    
    // Big tiger
    { result: '7', resultBanker: '6', resultPlayer: '0' },
    { result: '7', resultBanker: '6', resultPlayer: '1' },
    { result: '7', resultBanker: '6', resultPlayer: '2' },
    { result: '7', resultBanker: '6', resultPlayer: '3' },
    { result: '7', resultBanker: '6', resultPlayer: '4' },
    { result: '7', resultBanker: '6', resultPlayer: '5' },
    
     // Big tiger Banker pair
    { result: '74', resultBanker: '6', resultPlayer: '0' },
    { result: '74', resultBanker: '6', resultPlayer: '1' },
    { result: '74', resultBanker: '6', resultPlayer: '2' },
    { result: '74', resultBanker: '6', resultPlayer: '3' },
    { result: '74', resultBanker: '6', resultPlayer: '4' },
    { result: '74', resultBanker: '6', resultPlayer: '5' },

     // Big tiger player pair
    { result: '76', resultBanker: '6', resultPlayer: '0' },
    { result: '76', resultBanker: '6', resultPlayer: '1' },
    { result: '76', resultBanker: '6', resultPlayer: '2' },
    { result: '76', resultBanker: '6', resultPlayer: '3' },
    { result: '76', resultBanker: '6', resultPlayer: '4' },
    { result: '76', resultBanker: '6', resultPlayer: '5' },

     // Big tiger banker,player pair
    { result: '746', resultBanker: '6', resultPlayer: '0' },
    { result: '746', resultBanker: '6', resultPlayer: '1' },
    { result: '746', resultBanker: '6', resultPlayer: '2' },
    { result: '746', resultBanker: '6', resultPlayer: '3' },
    { result: '746', resultBanker: '6', resultPlayer: '4' },
    { result: '746', resultBanker: '6', resultPlayer: '5' },
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