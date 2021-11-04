const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8989/control/users/list/');
  await page.pdf({ 
    path: 'full.pdf', 
    fullPage: true, 
    margin: {
      top: ".5cm",
      right: ".5cm",
      bottom: ".5cm",
      left: ".5cm"
    }
  })
  await browser.close();
})();