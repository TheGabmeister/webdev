import { test, expect } from '@playwright/test';

// This test suite uses a local Todo app (todo-app.html).
// It demonstrates the most important Playwright concepts:
//   - Navigation, locators, actions, and assertions.

test.beforeEach(async ({ page }) => {
  // Navigate to the local app before every test
  await page.goto('todo-app.html');
});

test('has correct title', async ({ page }) => {
  await expect(page).toHaveTitle('Todo App');
});

test('can add a new todo item', async ({ page }) => {
  // Type into the input and press Enter
  await page.getByPlaceholder('What needs to be done?').fill('Buy groceries');
  await page.getByPlaceholder('What needs to be done?').press('Enter');

  // Assert the new item appears in the list
  const todoItem = page.getByTestId('todo-title');
  await expect(todoItem).toHaveText('Buy groceries');
});

test('can complete a todo item', async ({ page }) => {
  // Add a todo
  const input = page.getByPlaceholder('What needs to be done?');
  await input.fill('Walk the dog');
  await input.press('Enter');

  // Click the checkbox to complete it
  await page.getByRole('checkbox').click();

  // Assert it's marked as completed (the <li> gets a "completed" class)
  const listItem = page.getByTestId('todo-item');
  await expect(listItem).toHaveClass(/completed/);
});

test('can add multiple todos and check count', async ({ page }) => {
  const input = page.getByPlaceholder('What needs to be done?');

  // Add three items
  for (const item of ['Item A', 'Item B', 'Item C']) {
    await input.fill(item);
    await input.press('Enter');
  }

  // Assert all three appear
  await expect(page.getByTestId('todo-title')).toHaveCount(3);

  // Assert the footer shows "3 items left"
  await expect(page.getByText('3 items left')).toBeVisible();
});
