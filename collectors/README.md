# Farm RPG read-only collection kit

These tools collect evidence for the planner. They do not click game actions, spend resources, or require a password.

## Account pages

Open a Farm RPG page you want the planner to learn from, such as Profile, Help Requests, Tower, Masteries, Pets, Farm Buildings, or Inventory. Open the browser developer console, paste the contents of `collect-visible-page.js`, and press Enter. The script downloads a JSON file containing only the visible page text and basic page metadata. Review the file before sharing it.

Run it once per useful page. Page exports are deliberately raw because Farm RPG markup can change; the planner can parse the visible labels without depending on fragile CSS selectors.

## Measured runs

Copy `field-runs.template.json` and add one object per uninterrupted run. Record inventory differences, not individual clicks. For exploring, `actions` means Acorn Pie actions after any 5x Cabbage Stew or Lemon Cream Pie batching. `consumablesUsed` is the actual number of AP, Cider, Lemonade, Nets, or Large Nets consumed.

Summarize a log with:

```powershell
node tools\summarize-field-runs.mjs collectors\field-runs.json collectors\field-rates.json
```

The output contains weighted drops per action, drops per consumable, sample sizes, and approximate 95% rate ranges. Keep different locations, methods, meal combinations, and perk profiles in separate runs so the groups remain meaningful.

