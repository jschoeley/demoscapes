# Create Series of deathrate sex ratios by region, and subpopulation

# Init --------------------------------------------------------------------

library(yaml)
library(qs)
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

hmd <- qread(paths$input$deathrates_period_by_age.qs)

# Create series -----------------------------------------------------------

deathratesexratio_by_region_subpopulation <-
  bind_rows(hmd) |>
  mutate(value = ifelse(Female == 0, NA, Male / Female)) |>
  select(
    z = value,
    x = Year,
    y = Age,
    region = isocode,
    subpopulation = subpopulation
  ) |>
  mutate(
    z = round(z, 3)
  )

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = deathratesexratio_by_region_subpopulation,
  file = paths$output$deathratesexratio_by_region_subpopulation.csv,
  na = "."
)
