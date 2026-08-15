export async function scrollUntilStable(page, cardSelector, { maxRounds = 30, stableRounds = 4 } = {}) {
  let previous = 0;
  let stable = 0;

  for (let round = 0; round < maxRounds && stable < stableRounds; round += 1) {
    const result = await page.evaluate(selector => {
      const cards = [...document.querySelectorAll(selector)];
      const card = cards.at(-1);
      let scroller = card?.parentElement;

      while (scroller) {
        const style = getComputedStyle(scroller);
        if (scroller.scrollHeight > scroller.clientHeight + 40 && /auto|scroll/.test(style.overflowY)) break;
        scroller = scroller.parentElement;
      }

      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      else card?.scrollIntoView({ block: 'end' });
      return { count: cards.length, foundScroller: Boolean(scroller) };
    }, cardSelector);

    stable = result.count === previous ? stable + 1 : 0;
    previous = result.count;
    await page.waitForTimeout(result.foundScroller ? 1_500 : 900);
  }

  return page.locator(cardSelector).count();
}

export async function expandAll(page, selector) {
  const buttons = page.locator(selector);
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 2_000 }).catch(() => {});
    }
  }
}

export async function detectBlock(page, source) {
  const title = await page.title();
  const body = (await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '')).slice(0, 5_000);
  if (/captcha|unusual traffic|подтвердите, что вы не робот|проверка браузера/i.test(`${title}\n${body}`)) {
    throw new Error(`${source}: страница потребовала CAPTCHA или проверку браузера`);
  }
}
