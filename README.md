# Manufacturing Production & Quality Analysis Dashboard

An interactive React + Vite dashboard based on the supplied manufacturing CSV and the layout/visuals in the original Power BI PBIX.

## Run locally

1. Install Node.js (LTS) if it is not already installed.
2. Extract this ZIP and open the extracted `manufacturing-dashboard-web` folder in VS Code.
3. Open Terminal in VS Code and run:

   ```bash
   npm install
   npm run dev
   ```

   On Windows PowerShell, if `npm` is blocked, use `npm.cmd install` and `npm.cmd run dev`.
4. Open the local URL printed in the terminal (usually http://localhost:5173).

## Production build

```bash
npm run build
```

Vite writes the deployable site to `dist/`. Deploy this folder/project to Vercel as a Vite app. No Power BI login or Power BI embedding is required.

## Dashboard behavior

- Date range, Product, Machine ID, and Shift filters update all KPI cards and charts.
- Reset all restores the full dataset.
- Export filtered CSV downloads only the currently visible rows.
- KPI percentages are recalculated from totals: production efficiency = total actual / total planned × 100; rejection rate = total rejected / total actual × 100.

## Data note

The supplied dataset is synthetic educational/portfolio data, not real factory operational data.
