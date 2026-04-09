# Create Series of deathrates by region, sex, and subpopulation

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(dplyr)
library(tidyr)
library(readr)

# Constants ---------------------------------------------------------------

# input and output paths
setwd(".")
paths <- list()
paths$input <- list(
  deathrates_period_by_age.qs =
    "./dat/hmd-mortality/deathrates_period_by_age.qs"
)
paths$output <- list(
  deathrate_by_region_sex_subpopulation.csv =
    "./out/series_creation/deathrate_by_region_sex_subpopulation.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HMD data -----------------------------------------------------------

hmd <- qs_read(paths$input$deathrates_period_by_age.qs)

# Create series -----------------------------------------------------------

deathrate_by_region_sex_subpopulation <-
  bind_rows(hmd) |>
  pivot_longer(cols = c(Female, Male, Total)) |>
  mutate(
    wx = 1,
    wy = 1,
  ) |>
  select(
    z = value,
    x = Year,
    y = Age,
    wx, wy,
    region = isocode,
    sex = name,
    subpopulation = subpopulation
  ) |>
  mutate(across(c(x, y, wx, wy), as.integer))

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = deathrate_by_region_sex_subpopulation,
  file = paths$output$deathrate_by_region_sex_subpopulation.csv,
  na = "."
)
