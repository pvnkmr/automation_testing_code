const { test, expect } = require('@playwright/test');
const path = require('path');

test('Login, recharge, withdraw flow', async ({ page }) => {
  // Go to the login page
  await page.goto('https://pwa-dev.yhsszz.com/');

  //******************************************* Page load and set language to english if not in english start *******************//

  console.log('App load started');

  await expect(page.locator('input[placeholder="Phone number"]')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('input[placeholder="Please enter password"]')).toBeVisible({ timeout: 30000 });

  // Try to find the language dropdown or indicator
  const langDropdown = page.locator('text=English, [class*=language], footer').first();

  if (await langDropdown.count() > 0) {
    await langDropdown.waitFor({ timeout: 10000 });
    const selectedLang = await langDropdown.textContent();
    if (!selectedLang?.trim().toLowerCase().includes('english')) {
      await langDropdown.click();
      await page.locator('li, div').filter({ hasText: 'English' }).first().click();
      await page.waitForTimeout(1000);
    }
  }

  console.log('App load ended');
  // If already in English, do nothing and continue with the test

  //******************************************* Page load and set language to english if not in english end *********************//

  //******************************************* Login start *********************************************************************//

  console.log('Login started');

  // Fill in username and password
  await page.locator('input[placeholder="Phone number"]').nth(0).fill('501');
  await page.fill('input[placeholder="Please enter password"]', '111111');
  await page.click('button:has-text("Login")');
  await page.waitForTimeout(5000);

  const verificationInput = page.locator('input[placeholder*="verification code"], input[placeholder="Please enter verification code"]');
  if (await verificationInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await verificationInput.fill('000000');
    const loginBtn = page.locator('button:has-text("Login")');
    await expect(loginBtn).toBeEnabled({ timeout: 5000 });
    await loginBtn.click();
    await page.waitForTimeout(15000);
  }

  //******************************************* Login end ******************************************************************//

  //******************************************* Home page load start *******************************************************//

  // Wait for the home page to load by checking for a unique element (user id at the top)
  await expect(page.locator('text=00882157')).toBeVisible({ timeout: 5000 });

  // Check for the home page elements
  await expect(page.locator('text=Recharge')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Withdraw')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Transfer')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Casino Record')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Mobile Top Up')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Electricity Top Up')).toBeVisible({ timeout: 5000 });

  console.log('Login ended, home page loaded successfully');

  //******************************************* Home page load end *******************************************************//

  //******************************************* Internal transfer start *************************************************//
  
  await page.click('text=Transfer');

  console.log('Internal transfer started');

  await page.waitForTimeout(2000);

  // Fill receiver membership card number
  await page.fill('input[placeholder="Enter receiver member card number"]', '00882159');

  // Fill transfer amount
  await page.fill('input[placeholder="Enter amount"]', '1');
  await page.waitForTimeout(3000);

  // Locate the toggle switch that is currently disabled
  const toggle2 = page.locator('div[role="switch"][aria-checked="false"]');

  // Check if the toggle is visible within 5 seconds
  const shouldFillRoomNumber = await toggle2.isVisible({ timeout: 5000 }).catch(() => false);

  if (shouldFillRoomNumber) {
    // If the toggle is visible, click to enable it and wait for 2 seconds
    await toggle2.click();
    await page.waitForTimeout(2000);

    // Fill the room number field and wait for 3 seconds
    await page.fill('input[placeholder="Please enter payee name"]', 'Internal transfer fav');
    await page.waitForTimeout(3000);
  }
  // If the toggle is not visible, skip both actions and continue with the flow

  // Click the Confirm button
  await page.click('button:has-text("Confirm")');

  await page.waitForTimeout(2000);

  // Click the Confirm button again on the confirmation page
  await page.click('button:has-text("Confirm")');

  // Wait for 2 seconds after finishing
  await page.waitForTimeout(2000);

  // --- Enter fund password if prompted ---
  // Wait for the fund password screen to appear
  const fundPasswordInput3 = page.locator('text=Enter current fund password');
  if (await fundPasswordInput3.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Wait 5 seconds before entering password
    await page.waitForTimeout(5000);

    // Click the "1" button six times with a 1-second interval
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /^1$/ }).click();
      await page.waitForTimeout(1000);
    }
  }

  await page.waitForTimeout(2000);
  await page.click('text=Return');
  await page.waitForTimeout(2000);

  console.log('Internal transfer ended');
  
  //******************************************* Internal transfer end ***********************************************//

  //******************************************* Online Withdraw start ***********************************************//

  await page.click('text=Withdraw');

  console.log('Online Withdraw started');

  await page.waitForTimeout(1000);

  await page.click('text=Online Withdrawal');
  await page.waitForTimeout(6000);

  // Fill the receiving address
  await page.fill('input[placeholder="Enter the receiving address"]', '0x5a50407744202DA3A03a46aB173419b5819df70D');
  await page.waitForTimeout(5000);

  // Fill the withdraw amount
  await page.fill('input[placeholder*="withdraw amount"]', '1');
  await page.waitForTimeout(3000);

  // Locate the toggle switch that is currently disabled
  const toggle3 = page.locator('div[role="switch"][aria-checked="false"]');

  // Check if the toggle is visible within 5 seconds
  const shouldFillRoomNumber2 = await toggle2.isVisible({ timeout: 5000 }).catch(() => false);

  if (shouldFillRoomNumber2) {
    // If the toggle is visible, click to enable it and wait for 2 seconds
    await toggle3.click();
    await page.waitForTimeout(2000);

    // Fill the room number field and wait for 3 seconds
    await page.fill('input[placeholder="Please enter payee name"]', 'Internal transfer fav');
    await page.waitForTimeout(3000);
  }
  // If the toggle is not visible, skip both actions and continue with the flow

  // Click the Confirm button
  await page.click('button:has-text("Confirm")');
  // Wait for 3 seconds after finishing
  await page.waitForTimeout(3000);

  // --- Enter fund password if prompted ---
  // Wait for the fund password screen to appear
  const fundPasswordInput7 = page.locator('text=Enter current fund password');
  if (await fundPasswordInput7.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Wait 5 seconds before entering password
    await page.waitForTimeout(5000);

    // Click the "1" button six times with a 1-second interval
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /^1$/ }).click();
      await page.waitForTimeout(1000);
    }
  }

  await page.waitForTimeout(2000);
  await page.click('text=Return');
  await page.waitForTimeout(2000);

  console.log('Online Withdraw ended');

  //******************************************* Online Withdraw end **************************************************//

  //******************************************* USD Withdraw start ***************************************************//

  await page.click('text=Withdraw');

  console.log('USD Withdraw started');

  await page.waitForTimeout(1000);

  await page.click('text=USD Withdrawal');

  await page.waitForTimeout(1000);

  // Fill Account Number
  await page.fill('input[placeholder="Enter Account Number"]', '12345');
  await page.waitForTimeout(2000);

  // Fill Account Name
  await page.fill('input[placeholder="Enter Account Name"]', 'pannu');
  await page.waitForTimeout(1000);

  // Focus and fill Withdraw Amount (try click + fill first)
  const withdrawAmountSelector = 'input[placeholder*="withdraw amount"]';
  await page.click(withdrawAmountSelector);
  await page.fill(withdrawAmountSelector, '10');
  await page.waitForTimeout(3000);

  // Locate the toggle switch that is currently disabled
  const toggle4 = page.locator('div[role="switch"][aria-checked="false"]');

  // Check if the toggle is visible within 5 seconds
  const shouldFillRoomNumber3 = await toggle2.isVisible({ timeout: 5000 }).catch(() => false);

  if (shouldFillRoomNumber3) {
    // If the toggle is visible, click to enable it and wait for 2 seconds
    await toggle4.click();
    await page.waitForTimeout(2000);

    // Fill the room number field and wait for 3 seconds
    await page.fill('input[placeholder="Please enter payee name"]', 'Internal transfer fav');
    await page.waitForTimeout(3000);
  }
  // If the toggle is not visible, skip both actions and continue with the flow
  // Click Confirm
  await page.click('button:has-text("Confirm")');

  // Wait for 3 seconds after finishing
  await page.waitForTimeout(3000);

  // --- Enter fund password if prompted ---
  // Wait for the fund password screen to appear
  const fundPasswordInput2 = page.locator('text=Enter current fund password');
  if (await fundPasswordInput2.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Wait 5 seconds before entering password
    await page.waitForTimeout(5000);

    // Click the "1" button six times with a 1-second interval
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /^1$/ }).click();
      await page.waitForTimeout(1000);
    }
  }

  await page.waitForTimeout(2000);
  await page.click('button:has-text("Finish")');
  await page.waitForTimeout(3000);

  console.log('USD Withdraw ended');

  //******************************************* USD Withdraw end *****************************************************//

  //******************************************* Electric recharge start **************************************************//

  // Click Electricity Top Up
  await page.click('text=Electricity Top Up');

  console.log('Electric recharge started');

  await page.waitForTimeout(2000);

  // Click the building dropdown (the input or the arrow icon)
  await page.click('input[placeholder="Select your building"]');

  // Wait for the action sheet to appear and click "V"
  await page.click('button.van-action-sheet__item:has-text("V")');

  await page.waitForTimeout(2000);

  // Fill room number
  await page.fill('input[placeholder="Enter your room number"]', '085182');

  // Select 5 USD option
  await page.click('text=5 USD');
  await page.waitForTimeout(3000);

  // Locate the toggle switch that is currently disabled
  const toggle5 = page.locator('div[role="switch"][aria-checked="false"]');

  // Check if the toggle is visible within 5 seconds
  const shouldFillRoomNumber4 = await toggle2.isVisible({ timeout: 5000 }).catch(() => false);

  if (shouldFillRoomNumber4) {
    // If the toggle is visible, click to enable it and wait for 2 seconds
    await toggle5.click();
    await page.waitForTimeout(2000);

    // Fill the room number field and wait for 3 seconds
    await page.fill('input[placeholder="Please enter payee name"]', 'Internal transfer fav');
    await page.waitForTimeout(3000);
  }
  // If the toggle is not visible, skip both actions and continue with the flow

  // Click Pay now
  await page.click('button:has-text("Pay now")');
  await page.waitForTimeout(1000);

  // Click Confirm on electricity confirmation page
  await page.click('button:has-text("Confirm")');

  // Wait for 10 seconds after finishing
  await page.waitForTimeout(3000);

  // --- Enter fund password if prompted ---
  // Wait for the fund password screen to appear
  const fundPasswordInput4 = page.locator('text=Enter current fund password');
  if (await fundPasswordInput4.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Wait 5 seconds before entering password
    await page.waitForTimeout(5000);

    // Click the "1" button six times with a 1-second interval
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /^1$/ }).click();
      await page.waitForTimeout(1000);
    }
  }

  await page.waitForTimeout(2000);
  await page.click('text=Return');
  await page.waitForTimeout(2000);

  console.log('Electric recharge ended');

  //******************************************* Electric recharge end ************************************************//

  //******************************************* Fav list operation start *********************************************//

  // Click on "Fav button"
  await page.locator('button.heart-btn').click();

  console.log('Fav list select, edit and delete started');

  await page.waitForTimeout(5000);

  // Wait for the favorite list to load
  await page.waitForSelector('.van-list', { timeout: 10000 });

  const firstFavItem = page.locator('.box-btn.gap-5').first();
  await firstFavItem.locator('.bg-transparent.border-0').nth(0).click();
  await page.waitForTimeout(2000);

  // Fill update text and save
  await page.fill('input[placeholder="Please enter payee name"]', 'update fav');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(2000);

  // Click the delete (trash) button (second button in .box-btn)
  await firstFavItem.locator('.bg-transparent.border-0').nth(1).click();
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Confirm")');
  await page.waitForTimeout(3000);

  // Click the back "<" icon at the top of the Profile settings page
  await page.locator('.van-icon-arrow-left').click();
  await page.waitForTimeout(2000);

  console.log('Fav list select, edit and delete ended');

  //******************************************* Fav list operation end ***********************************************//

  //******************************************* Online recharge start ************************************************//

  await page.click('text=Recharge');

  console.log('Online recharge started');

  await page.click('text=Cash Recharge');

  // Fill recharge amount (if required)
  await page.fill('input[placeholder="Enter recharge amount"]', '10');

  // Upload image from the Playwright folder
  const imagePath = path.resolve(__dirname, '../images/upload.png');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(imagePath);
  await page.waitForTimeout(2000);

  // Click the Submission button
  await page.click('button:has-text("Submission")');

  // Wait 10 seconds after submission
  await page.waitForTimeout(10000);

  // Click the Finish button (adjust selector if needed)
  await page.click('button:has-text("Finish")');

  // Wait another 2 seconds (simulate confirmation/redirect)
  await page.waitForTimeout(2000);

  console.log('Online recharge ended');

  //******************************************* Online recharge end ******************************************************//

  //******************************************* Hotel booking start ******************************************************//

  await page.click('text=VIP service');

  console.log('Hotel booking started');

  await page.waitForTimeout(2000);

  // Click on "Hotel"
  await page.click('text=Hotel');
  await page.waitForTimeout(5000);

  // Select the first room option (Room type: Gold)
  await page.locator('div:has-text("Room type: Gold")').first().click();

  await page.waitForTimeout(6000);

  await page.click('text=I want to book a room');

  await page.waitForTimeout(2000);

  // Select Start date
  await page.click('input[placeholder="Start"]');
  await page.waitForTimeout(1000); // Let the picker animate in
  await page.waitForSelector('button.van-picker__confirm:visible', { timeout: 5000 });
  await page.locator('.van-picker-column .van-picker-column__item--selected').click({ force: true }).catch(() => { });
  await page.click('button.van-picker__confirm:visible');

  // Select End date
  await page.click('input[placeholder="End"]');
  await page.waitForTimeout(1000); // Let the picker animate in
  await page.waitForSelector('button.van-picker__confirm:visible', { timeout: 5000 });
  await page.locator('.van-picker-column .van-picker-column__item--selected').click({ force: true }).catch(() => { });
  await page.click('button.van-picker__confirm:visible');

  // Confirm the date selection
  await page.click('button:has-text("Book Now")');

  await page.waitForTimeout(2000);

  // Select the payment method with USD (regardless of amount)
  await page.locator('.van-radio:has-text("USD")').first().click();

  // Click the "Book Now" button
  await page.click('button:has-text("Book Now")');

  // Click the "Finish" button
  await page.click('button:has-text("Finish")');

  await page.waitForTimeout(2000);

  console.log('Hotel booking ended');

  //******************************************* Hotel booking end ********************************************************//

  //******************************************* Transportation booking start *********************************************//

  // Click on "Transportation"
  await page.click('text=Transportation');

  console.log('Transportation booking started');

  // Click the "I want to book a car" button
  await page.click('button:has-text("I want to book a car")');

  await page.waitForTimeout(3000);

  // Select "Point of departure" as "White Sands Palace"
  await page.locator('input[placeholder="Choose location"]').nth(0).click();
  await page.waitForSelector('button.van-action-sheet__item:has-text("White Sands Palace")', { timeout: 10000 });
  await page.click('button.van-action-sheet__item:has-text("White Sands Palace")');
  await page.waitForTimeout(1000);

  // Select "Destination" as "Phnom Penh City"
  await page.locator('input[placeholder="Choose location"]').nth(1).click();
  await page.waitForTimeout(1000);
  await page.locator('button.van-action-sheet__item:visible').first().waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('button.van-action-sheet__item:visible', { hasText: 'Phnom Penh' }).first().click();
  await page.waitForTimeout(1000);

  // Select date
  await page.click('input[placeholder="Date"]');
  await page.waitForSelector('button.van-picker__confirm:visible', { timeout: 5000 });
  await page.locator('.van-picker-column .van-picker-column__item--selected').click({ force: true }).catch(() => { });
  await page.click('button.van-picker__confirm:visible');

  // Select time
  await page.click('input[placeholder="Time"]');
  await page.waitForSelector('button.van-picker__confirm:visible', { timeout: 5000 });
  await page.locator('.van-picker-column .van-picker-column__item--selected').click({ force: true }).catch(() => { });
  await page.click('button.van-picker__confirm:visible');

  // Click the "Book Now" button
  await page.click('button:has-text("Book Now")');

  await page.waitForTimeout(3000);

  // Click the "Book Now" button
  await page.click('button:has-text("Finish")');

  await page.waitForTimeout(2000);

  console.log('Transportation booking ended');

  //******************************************* Transportation booking end ***********************************************//

  //******************************************* Profile start ************************************************************//

  await page.click('text=Profile');

  console.log('Profile update started');

  await page.waitForTimeout(1000);

  await page.click('text=Profile settings');

  await page.waitForTimeout(1000);

  // Edit Username
  await page.fill('input[placeholder="Edit Username"]', 'pannu');
  await page.waitForTimeout(1000);

  // Set Birthday to current date using date picker
  await page.click('input[placeholder="Year/Month/Day"]');
  await page.waitForTimeout(1000); // Let the picker animate in
  await page.waitForSelector('button.van-picker__confirm:visible', { timeout: 5000 });
  await page.locator('.van-picker-column .van-picker-column__item--selected').click({ force: true }).catch(() => { });
  await page.click('button.van-picker__confirm:visible');

  // Select first value from Country dropdown
  await page.click('input[placeholder="Country"]');
  await page.waitForTimeout(1000);
  await page.click('button.van-action-sheet__item:has-text("Afghanistan")');
  await page.waitForTimeout(1000);

  // Fill Email Address with a random email
  const randomEmail = `test${Math.floor(Math.random() * 10000)}@gmail.com`;
  await page.waitForTimeout(2000);
  await page.fill('input[placeholder="Email Address"]', randomEmail);
  await page.waitForTimeout(1000);

  // Select first value from Gender dropdown
  await page.click('input[placeholder="Gender"]');
  await page.waitForTimeout(1000);
  await page.click('button.van-action-sheet__item:has-text("Male")');
  await page.waitForTimeout(1000);

  // Click Save button
  await page.click('button:has-text("Save")');

  await page.waitForTimeout(3000);

  // Click Save button
  await page.click('button:has-text("Finish")');

  // Click the back "<" icon at the top of the Profile settings page
  await page.locator('.van-icon-arrow-left').click();

  await page.waitForTimeout(2000);

  console.log('Profile update ended');

  //******************************************* Profile end *********************************************************************//

  //******************************************* Change fund password start ******************************************************//

  await page.waitForTimeout(1000);
  await page.click('text=Profile');

  console.log('Change fund password flow started');

  await page.waitForTimeout(1000);
  await page.click('text=Security settings');
  await page.waitForTimeout(1000);
  await page.click('text=Fund password setting');

  // Fill current fund password
  await page.fill('input[placeholder="Please enter your current fund password"]', '111111');
  await page.waitForTimeout(1000);

  // Fill SMS verification code
  await page.fill('input[placeholder="Please enter verification code"]', '000000');
  await page.waitForTimeout(1000);

  // Fill new fund password
  await page.fill('input[placeholder="The password is 6 numbers"]', '123456');
  await page.waitForTimeout(1000);

  // Fill confirm fund password
  await page.fill('input[placeholder="Please confirm your fund password"]', '123456');
  await page.waitForTimeout(1000);

  // Click the Submit button
  await page.click('button:has-text("Submit")');
  await page.waitForTimeout(10000);
  await page.click('button:has-text("Finish")');
  await page.waitForTimeout(1000);
  await page.click('text=Home');
  await page.waitForTimeout(1000);

  console.log('Change fund password ended');

  //----------------------check new fund password change using electric recharge----------------------//

  // Click Electricity Top Up
  await page.click('text=Electricity Top Up');

  console.log('Verify new fund password change using electric recharge started');

  await page.waitForTimeout(2000);

  // Click the building dropdown (the input or the arrow icon)
  await page.click('input[placeholder="Select your building"]');

  // Wait for the action sheet to appear and click "V"
  await page.click('button.van-action-sheet__item:has-text("V")');

  await page.waitForTimeout(2000);

  // Fill room number
  await page.fill('input[placeholder="Enter your room number"]', '1234');

  // Select 5 USD option
  await page.click('text=5 USD');

  // Click Pay now
  await page.click('button:has-text("Pay now")');

  // Click Confirm on electricity confirmation page
  await page.click('button:has-text("Confirm")');

  // Wait for 10 seconds after finishing
  await page.waitForTimeout(3000);

  // --- Enter fund password if prompted ---
  // Wait for the fund password screen to appear
  const fundPasswordInput9 = page.locator('text=Enter current fund password');
  if (await fundPasswordInput9.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Wait 5 seconds before entering password
    await page.waitForTimeout(5000);

    // Click the buttons for 1, 2, 3, 4, 5, 6 with a 1-second interval to enter password "123456"
    const password = '123456';
    for (const digit of password) {
      await page.getByRole('button', { name: new RegExp(`^${digit}$`) }).click();
      await page.waitForTimeout(1000);
    }
  }

  await page.waitForTimeout(2000);
  await page.click('text=Return');
  await page.waitForTimeout(2000);

  console.log('Verify new fund password change using electric recharge ended');

  //----------------------Reset new fund password to old fund password----------------------//

  await page.waitForTimeout(1000);
  await page.click('text=Profile');

  console.log('Reset new fund password to old fund password started');

  await page.waitForTimeout(1000);
  await page.click('text=Security settings');
  await page.waitForTimeout(1000);
  await page.click('text=Fund password setting');
  // Fill current fund password
  await page.fill('input[placeholder="Please enter your current fund password"]', '123456');
  await page.waitForTimeout(1000);
  // Fill SMS verification code
  await page.fill('input[placeholder="Please enter verification code"]', '000000');
  await page.waitForTimeout(1000);
  // Fill new fund password
  await page.fill('input[placeholder="The password is 6 numbers"]', '111111');
  await page.waitForTimeout(1000);
  // Fill confirm fund password
  await page.fill('input[placeholder="Please confirm your fund password"]', '111111');
  await page.waitForTimeout(1000);
  // Click the Submit button
  await page.click('button:has-text("Submit")');
  await page.waitForTimeout(10000);
  await page.click('button:has-text("Finish")');
  await page.waitForTimeout(1000);
  await page.click('text=Home');

  console.log('Reset new fund password to old fund password ended');

  console.log('Change fund password flow ended');

  await page.waitForTimeout(1000);

  //******************************************* Change fund password end *************************************************//

  //******************************************* Change password start ****************************************************//

  await page.waitForTimeout(1000);

  await page.click('text=Profile');

  console.log('Change password flow started');

  await page.waitForTimeout(1000);

  await page.click('text=Security settings');

  await page.waitForTimeout(1000);

  await page.click('text=Password setting');

  await page.waitForTimeout(1000);

  // Fill current password
  await page.fill('input[placeholder="Please enter your current password"]', '111111');
  await page.waitForTimeout(1000);

  // Fill SMS verification code
  await page.fill('input[placeholder="Please enter verification code"]', '000000');
  await page.waitForTimeout(1000);

  // Fill new password
  await page.fill('input[placeholder="Please enter the password at least 6 digits"]', '123456');
  await page.waitForTimeout(1000);

  // Fill confirm password
  await page.fill('input[placeholder="Please confirm your password"]', '123456');
  await page.waitForTimeout(1000);

  // Click the Submit button
  await page.click('button:has-text("Submit")');

  await page.waitForTimeout(10000);

  // Click the Submit button
  await page.click('button:has-text("Finish")');

  await page.waitForTimeout(2000);

  // Click Logout
  await page.click('button:has-text("Logout")');

  await page.waitForTimeout(2000);

  // Wait for the logout confirmation dialog to appear
  await page.waitForSelector('.van-dialog__footer .van-dialog__confirm', { timeout: 5000 });

  // Click the "Logout" button in the dialog
  await page.click('.van-dialog__footer .van-dialog__confirm');

  //Login again to check the new password
  await page.waitForTimeout(2000);
  await expect(page.locator('input[placeholder="Phone number"]')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('input[placeholder="Please enter password"]')).toBeVisible({ timeout: 3000 });
  // Fill in the new phone number and password
  await page.fill('input[placeholder="Phone number"]', '501');
  await page.fill('input[placeholder="Please enter password"]', '123456');
  // Click the Login button
  await page.click('button:has-text("Login")');
  await page.waitForTimeout(5000);

  const verificationInput4 = page.locator('input[placeholder*="verification code"], input[placeholder="Please enter verification code"]');
  if (await verificationInput4.isVisible({ timeout: 5000 }).catch(() => false)) {
    await verificationInput4.fill('000000');
    const loginBtn = page.locator('button:has-text("Login")');
    await expect(loginBtn).toBeEnabled({ timeout: 5000 });
    await loginBtn.click();
    await page.waitForTimeout(20000);
  }

  // Check for the home page elements
  await expect(page.locator('text=Recharge')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Withdraw')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Transfer')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Casino Record')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Mobile Top Up')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Electricity Top Up')).toBeVisible({ timeout: 5000 });

  // -------------------------Change password back to old password--------------------------//

  await page.waitForTimeout(1000);
  await page.click('text=Profile');

  console.log('Change password back to old password flow started');

  await page.waitForTimeout(1000);
  await page.click('text=Security settings');
  await page.waitForTimeout(1000);
  await page.click('text=Password setting');
  // Fill current password
  await page.fill('input[placeholder="Please enter your current password"]', '123456');
  await page.waitForTimeout(1000);
  // Fill SMS verification code
  await page.fill('input[placeholder="Please enter verification code"]', '000000');
  await page.waitForTimeout(1000);
  // Fill new password
  await page.fill('input[placeholder="Please enter the password at least 6 digits"]', '111111');
  await page.waitForTimeout(1000);
  // Fill confirm password
  await page.fill('input[placeholder="Please confirm your password"]', '111111');
  await page.waitForTimeout(1000);
  // Click the Submit button
  await page.click('button:has-text("Submit")');
  await page.waitForTimeout(10000);
  // Click the Submit button
  await page.click('button:has-text("Finish")');

  await page.waitForTimeout(2000);

  // Click Logout
  await page.click('button:has-text("Logout")');

  await page.waitForTimeout(2000);

  // Wait for the logout confirmation dialog to appear
  await page.waitForSelector('.van-dialog__footer .van-dialog__confirm', { timeout: 5000 });

  // Click the "Logout" button in the dialog
  await page.click('.van-dialog__footer .van-dialog__confirm');
  //Login again to check the new password
  await page.waitForTimeout(2000);
  await expect(page.locator('input[placeholder="Phone number"]')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('input[placeholder="Please enter password"]')).toBeVisible({ timeout: 3000 });
  // Fill in the new phone number and password
  await page.fill('input[placeholder="Phone number"]', '501');
  await page.fill('input[placeholder="Please enter password"]', '111111');
  // Click the Login button
  await page.click('button:has-text("Login")');
  await page.waitForTimeout(5000);

  const verificationInput5 = page.locator('input[placeholder*="verification code"], input[placeholder="Please enter verification code"]');
  if (await verificationInput5.isVisible({ timeout: 5000 }).catch(() => false)) {
    await verificationInput5.fill('000000');
    const loginBtn = page.locator('button:has-text("Login")');
    await expect(loginBtn).toBeEnabled({ timeout: 5000 });
    await loginBtn.click();
    await page.waitForTimeout(20000);
  }

  // Check for the home page elements
  await expect(page.locator('text=Recharge')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Withdraw')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Transfer')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Casino Record')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Mobile Top Up')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Electricity Top Up')).toBeVisible({ timeout: 5000 });

  console.log('Change password back to old password flow ended');
  console.log('Change password flow ended');

  //******************************************* Change password end ******************************************************//

  //******************************************* Change phonenumber start *************************************************//

  await page.waitForTimeout(1000);
  await page.click('text=Profile');
  console.log('Change phonenumber started');

  await page.waitForTimeout(1000);
  await page.click('text=Change phone number');

  // Fill SMS verification code for current phone
  await page.fill('input[placeholder="Please enter verification code"]', '000000');

  // Generate a random 8-digit number with no repeated digits and not in sequence and all unique
  function generateRandomPhone() {
    let digits = '123456789'.split('');
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, 8).join('');
  }
  const newPhone = generateRandomPhone();

  await page.waitForTimeout(1000);

  // Fill new phone number (the second phone number input)
  await page.locator('input[placeholder="Phone number"]').nth(1).fill(newPhone);

  // Fill SMS verification code for new phone (the second code input)
  await page.locator('input[placeholder="Please enter verification code"]').nth(1).fill('000000');

  // Click Submit button
  await page.click('button:has-text("Submit")');

  await page.waitForTimeout(1000);

  // Click Submit button
  await page.click('button:has-text("Finish")');

  await page.waitForTimeout(2000);

  // Click Logout
  await page.click('button:has-text("Logout")');

  await page.waitForTimeout(2000);

  // Wait for the logout confirmation dialog to appear
  await page.waitForSelector('.van-dialog__footer .van-dialog__confirm', { timeout: 5000 });

  // Click the "Logout" button in the dialog
  await page.click('.van-dialog__footer .van-dialog__confirm');

  //Login again to verify the new phone number
  await page.waitForTimeout(2000);
  await expect(page.locator('input[placeholder="Phone number"]')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('input[placeholder="Please enter password"]')).toBeVisible({ timeout: 2000 });
  // Fill in the new phone number and password
  await page.fill('input[placeholder="Phone number"]', newPhone);
  await page.fill('input[placeholder="Please enter password"]', '111111');

  // Click the Login button
  await page.click('button:has-text("Login")');
  await page.waitForTimeout(5000);

  // Wait for the login process to complete
  const verificationInput2 = page.locator('input[placeholder*="verification code"], input[placeholder="Please enter verification code"]');
  if (await verificationInput2.isVisible({ timeout: 5000 }).catch(() => false)) {
    await verificationInput2.fill('000000');
    const loginBtn = page.locator('button:has-text("Login")');
    await expect(loginBtn).toBeEnabled({ timeout: 5000 });
    await loginBtn.click();
    await page.waitForTimeout(20000);
  }

  // Check for the home page elements
  await expect(page.locator('text=Recharge')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Withdraw')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Transfer')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Casino Record')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Mobile Top Up')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Electricity Top Up')).toBeVisible({ timeout: 10000 });

  //------------------------changing new phone number to old phone number----------------------//

  await page.waitForTimeout(1000);

  await page.click('text=Profile');

  console.log('Changing new phone number to old phone number started');

  await page.waitForTimeout(1000);

  await page.click('text=Change phone number');

  // Fill SMS verification code for current phone
  await page.fill('input[placeholder="Please enter verification code"]', '000000');

  // Fill new phone number (the second phone number input)
  await page.locator('input[placeholder="Phone number"]').nth(1).fill('501');

  // Fill SMS verification code for new phone (the second code input)
  await page.locator('input[placeholder="Please enter verification code"]').nth(1).fill('000000');

  // Click Submit button
  await page.click('button:has-text("Submit")');

  await page.waitForTimeout(1000);

  // Click Submit button
  await page.click('button:has-text("Finish")');

  await page.waitForTimeout(2000);

  // Click Logout
  await page.click('button:has-text("Logout")');

  await page.waitForTimeout(2000);

  // Wait for the logout confirmation dialog to appear
  await page.waitForSelector('.van-dialog__footer .van-dialog__confirm', { timeout: 5000 });

  // Click the "Logout" button in the dialog
  await page.click('.van-dialog__footer .van-dialog__confirm');

  //Login again wih old phone number
  await page.waitForTimeout(2000);
  await expect(page.locator('input[placeholder="Phone number"]')).toBeVisible({ timeout: 2000 });
  await expect(page.locator('input[placeholder="Please enter password"]')).toBeVisible({ timeout: 3000 });
  // Fill in the new phone number and password
  await page.fill('input[placeholder="Phone number"]', '501');
  await page.fill('input[placeholder="Please enter password"]', '111111');
  // Click the Login button
  await page.click('button:has-text("Login")');
  await page.waitForTimeout(5000);

  // Wait for the login process to complete
  const verificationInput3 = page.locator('input[placeholder*="verification code"], input[placeholder="Please enter verification code"]');
  if (await verificationInput3.isVisible({ timeout: 5000 }).catch(() => false)) {
    await verificationInput3.fill('000000');
    const loginBtn = page.locator('button:has-text("Login")');
    await expect(loginBtn).toBeEnabled({ timeout: 5000 });
    await loginBtn.click();
    await page.waitForTimeout(20000);
  }

  // Wait for the home page to load by checking for a unique element (user id at the top)
  await expect(page.locator('text=00882157')).toBeVisible({ timeout: 3000 });
  // Check for the home page elements
  await expect(page.locator('text=Recharge')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Withdraw')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Transfer')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Casino Record')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Mobile Top Up')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Electricity Top Up')).toBeVisible({ timeout: 3000 });

  // Click the profile button
  await page.click('text=Profile');
  await page.waitForTimeout(2000);

  // Click Logout
  const logoutBtn1 = page.locator('button:has-text("Logout")');
  await logoutBtn1.click();
  await page.waitForTimeout(1000);

  // Wait for the logout confirmation dialog to appear
  const logoutConfirmBtn1 = page.locator('.van-dialog__footer .van-dialog__confirm');
  await logoutConfirmBtn1.click();
  await page.waitForTimeout(3000);

  console.log('Changing new phone number to old phone number ended');
  console.log('Change phonenumber ended');

  //******************************************* Change phonenumber end **********************************************************//

  //******************************************* Registration start **************************************************************//

  // Click the "Register" tab and wait for the registration form to appear
  await page.click('text=Register');

  console.log('Registration started');

  await page.waitForTimeout(3000);

  // Generate a 7-digit random phone number with unique digits
  function generateUnique7DigitPhone() {
    const digits = '123456789'.split('');
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    return digits.slice(0, 7).join('');
  }
  const phoneNumber = generateUnique7DigitPhone();

  // Wait for the registration phone input to be visible (second input)
  const phoneInput = page.locator('input[placeholder="Phone number"]').nth(1);
  await phoneInput.fill(phoneNumber);
  await page.waitForTimeout(2000);

  // Fill the SMS verification code
  const smsInput = page.locator('input[placeholder="Please enter verification code"]');
  await smsInput.fill('000000');
  await page.waitForTimeout(2000);

  // Fill password and confirm password
  const passwordInput = page.locator('input[placeholder="Please enter the password at least 6 digits"]');
  await passwordInput.fill('111111');
  await page.waitForTimeout(2000);

  const confirmPasswordInput = page.locator('input[placeholder="Please enter password again"]');
  await confirmPasswordInput.fill('111111');
  await page.waitForTimeout(2000);

  // Click the Sign up button
  const signUpBtn = page.locator('button:has-text("Sign up")');
  await signUpBtn.click();
  await page.waitForTimeout(2000);

  // Wait for the continue button and click it
  const continueBtn = page.locator('button:has-text("Continue")');
  await continueBtn.click();
  await page.waitForTimeout(2000);

  // Fill New fund password
  const fundPwdInput = page.locator('input[placeholder="The password is 6 numbers"]');
  await fundPwdInput.fill('111111');
  await page.waitForTimeout(2000);

  // Fill Password Confirmation
  const fundPwdConfirmInput = page.locator('input[placeholder="Please enter the new fund password"]');
  await fundPwdConfirmInput.fill('111111');
  await page.waitForTimeout(2000);

  // Click the Submit button
  const submitBtn = page.locator('button:has-text("Submit")');
  await submitBtn.click();
  await page.waitForTimeout(2000);

  // Click the Finish button
  const finishBtn = page.locator('button:has-text("Finish")');
  await finishBtn.click();
  await page.waitForTimeout(2000);

  // Click the continue button
  await continueBtn.click();
  await page.waitForTimeout(4000);

  //--- Question 1 ---
  // Click the first "Choose Question" dropdown
  await page.locator('select[placeholder="Choose Question"], textarea[placeholder="Choose Question"], input[placeholder="Choose Question"]').nth(0).click();

  // Wait for the option to appear and click it
  await page.waitForSelector('p.select-question:has-text("Where you met your first girlfriend?")', { timeout: 10000 });
  await page.click('p.select-question:has-text("Where you met your first girlfriend?")');
  await page.waitForTimeout(1000);
  // Fill the answer
  await page.locator('input[placeholder="Input Answer"]').nth(0).fill('1');
  await page.waitForTimeout(1000);

  // Click the second "Choose Question" dropdown
  await page.locator('select[placeholder="Choose Question"], textarea[placeholder="Choose Question"], input[placeholder="Choose Question"]').nth(1).click();

  // Wait for the option to appear and click it
  await page.waitForSelector('p.select-question:has-text("What is your first pet\'s name?")', { timeout: 10000 });
  await page.click('p.select-question:has-text("What is your first pet\'s name?")');
  await page.waitForTimeout(1000);
  // Fill the answer
  await page.locator('input[placeholder="Input Answer"]').nth(1).fill('1');
  await page.waitForTimeout(1000);

  // Click the second "Choose Question" dropdown
  await page.locator('select[placeholder="Choose Question"], textarea[placeholder="Choose Question"], input[placeholder="Choose Question"]').nth(2).click();

  // Wait for the option to appear and click it
  await page.waitForSelector('p.select-question:has-text("What is your first favorite song?")', { timeout: 10000 });
  await page.click('p.select-question:has-text("What is your first favorite song?")');
  await page.waitForTimeout(1000);
  // Fill the answer
  await page.locator('input[placeholder="Input Answer"]').nth(2).fill('1');
  await page.waitForTimeout(1000);

  // Click the Submit button
  const secSubmitBtn = page.locator('button:has-text("Submit")');
  await secSubmitBtn.click();
  await page.waitForTimeout(1000);

  // Click the Finish button
  await finishBtn.click();
  await page.waitForTimeout(2000);

  // Check for the home page elements
  await expect(page.locator('text=Recharge')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Withdraw')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Transfer')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Casino Record')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Mobile Top Up')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=Electricity Top Up')).toBeVisible({ timeout: 3000 });

  // Click the profile button
  await page.click('text=Profile');
  await page.waitForTimeout(2000);

  // Click Logout
  const logoutBtn = page.locator('button:has-text("Logout")');
  await logoutBtn.click();
  await page.waitForTimeout(1000);

  // Wait for the logout confirmation dialog to appear
  const logoutConfirmBtn = page.locator('.van-dialog__footer .van-dialog__confirm');
  await logoutConfirmBtn.click();
  await page.waitForTimeout(3000);

  console.log('Registration flow ended, logged in successfully with new registered user and logout');

  //******************************************* Registration end ****************************************************************//

  //close the browser
  await page.waitForTimeout(2000);
  await page.context().browser().close();
});
