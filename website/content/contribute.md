---
title: Contribute
---

# Contribute

Demoscapes is open for [collaboration](./about.html).

If you would like to see your Lexis data rendered on this website, please reach out via

- email: [schoeley@demogr.mpg.de](mailto:schoeley@demogr.mpg.de)
- GitHub: open an issue or pull request at [github.com/jschoeley/demoscapes](https://github.com/jschoeley/demoscapes).

Demoscapes is open to submissions of demographic outcomes indexed by two time dimensions. Submissions of Lexis surface data from published papers are also welcome. If accepted, we will always link back to your paper or stated source when showing your surfaces.

## What to prepare

Contributions are integrated manually, not uploaded through the website. To prepare a contribution, send one CSV file for each series together with a short metadata note that describes the data source and how it should appear on the site.

Please send:

1. One CSV file for each Lexis surface series.
2. A short metadata description covering the checklist below.
3. Citation, source URL, and license or reuse conditions for the data.

If your contribution contains several related series, keep them in a single package and explain how they belong together.

## Required CSV format

Each CSV file should represent one series. The required columns are:

> **`z`**: cell value, e.g. mortality rate \
> **`x`**: x-axis value, e.g. period year \
> **`y`**: y-axis value, e.g. age year \
> **`wx`**: width of the x interval \
> **`wy`**: width of the y interval

Additional columns are allowed and are interpreted as strata dimensions such as `sex`, `region`, or another grouping variable.

Example:

> ```csv
> z,x,y,wx,wy,kin,region
> 8.77,1950,0,5,5,Aunts/Uncles,AW
> 5.94,1950,0,5,5,Aunts/Uncles,AF
> 5.63,1950,0,5,5,Aunts/Uncles,AO
> 9.90,1950,0,5,5,Aunts/Uncles,AI
> ```

## Required metadata

Please include the following information with your CSV file or files. The example values below are taken from the collection "Estimates of human kinship for all countries".

> **source URL**: https://doi.org/10.7910/DVN/FKCRHW \
> **preferred citation**: D. Alburez-Gutierrez, I. Williams, & H. Caswell, Projections of human kinship for all countries, PNAS (2023). \
> **data license**: CC0.1.0 \
> **series title**: number of kin by kin type and region \
> **measure name and unit**: Number of kin, unit "Kin" \
> **measure description**: The number of kin a person has. \
> **x axis**: period, unit "Year" \
> **y axis**: age, unit "Year"

If your CSV includes strata columns, also provide the meaning of each one and consider sharing a codebook if the labels are not clear by themselves.
