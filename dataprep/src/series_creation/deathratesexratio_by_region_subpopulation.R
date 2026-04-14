# Create Series of deathrate sex ratios by region, and subpopulation

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
  deathrates_period_by_age.qs = "./dat/hmd-mortality/deathrates_period_by_age.qs"
)
paths$output <- list(
  deathratesexratio_by_region_subpopulation.csv =
    "./out/series_creation/deathratesexratio_by_region_subpopulation.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HMD data -----------------------------------------------------------

hmd <- qs_read(paths$input$deathrates_period_by_age.qs)

# Create series -----------------------------------------------------------

deathratesexratio_by_region_subpopulation <-
  bind_rows(hmd) |>
  mutate(
    value = ifelse(Female == 0, NA, Male / Female),
    wx = 1, wy = 1
  ) |>
  select(
    z = value,
    x = Year,
    y = Age,
    wx, wy,
    region = isocode,
    subpopulation = subpopulation
  ) |>
  mutate(
    z = round(z, 3)
  ) |>
  mutate(across(c(x, y, wx, wy), as.integer))

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = deathratesexratio_by_region_subpopulation,
  file = paths$output$deathratesexratio_by_region_subpopulation.csv,
  na = "."
)
