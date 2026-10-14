import {expect,test} from "@playwright/test";
test.use({baseURL:process.env.LIFE_OS_E2E_URL??"http://localhost:3210",channel:process.env.LIFE_OS_E2E_CHANNEL||undefined,viewport:{width:390,height:844}});
test.beforeEach(async({page})=>{
 await page.goto("/access");await page.getByLabel("Lozinka").fill(process.env.LIFE_OS_E2E_PASSWORD??"life-os-disposable-smoke-password-2026");
 await page.getByRole("button",{name:"Prijavi se"}).click();await expect(page).toHaveURL("/");
});
test("creates a calendar task with an action date independent of its due date",async({page})=>{
 const title=`Action date provera ${Date.now()}`;
 await page.goto("/calendar");await page.getByRole("region",{name:"Calendar dates"}).locator("div.cursor-pointer").first().click();
 const dialog=page.getByRole("dialog");
 await expect(dialog.getByLabel("Action date",{exact:true})).toBeVisible();
 const due=await dialog.getByLabel("Due",{exact:true}).textContent();
 await dialog.getByLabel("Title",{exact:true}).fill(title);
 await dialog.getByLabel("Action date",{exact:true}).click();
 await page.locator('[data-day="2026-10-20"]').click();
 await expect(dialog.getByLabel("Due",{exact:true})).toHaveText(due!);
 await dialog.getByRole("button",{name:"Dodaj vreme"}).first().click();
 await dialog.getByLabel("Action date",{exact:true}).click();
 await page.getByLabel("Sati",{exact:true}).selectOption("10");
 await page.getByLabel("Minuti",{exact:true}).selectOption("30");
 await page.getByRole("button",{name:"Gotovo",exact:true}).click();
 await dialog.getByRole("button",{name:"Create",exact:true}).click();await expect(dialog).not.toBeVisible();
 await page.goto("/tasks");await page.getByRole("link",{name:title,exact:true}).click();
 await expect(page.locator('input[type="datetime-local"]').first()).toHaveValue("2026-10-20T10:30");
});
test("exposes an accessible action date in the full task form",async({page})=>{
 await page.goto("/tasks");await page.getByRole("button",{name:"New task",exact:true}).click();
 const dialog=page.getByRole("dialog");
 await expect(dialog.getByLabel("Action date",{exact:true})).toBeVisible();
 await dialog.getByLabel("Action date",{exact:true}).click();
 await page.locator('[data-day="2026-10-21"]').click();
 await expect(dialog.getByLabel("Due",{exact:true})).toHaveText("Izaberite datum");
});
