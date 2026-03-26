# Create Series of fertility rates by region

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
  fertilityrate_period_by_age.qs =
    "./dat/hfd/fertilityrates_period_by_age.qs"
)
paths$output <- list(
  fertilityrate_by_region.csv =
    "./out/series_creation/fertilityrate_by_region.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HFD data -----------------------------------------------------------

hfd <- qs_read(paths$input$fertilityrate_period_by_age.qs)

# Create series -----------------------------------------------------------

fertilityrate_by_region <-
  bind_rows(hfd) |>
  mutate(
    wx = 1,
    wy = 1
  ) |>
  select(
    z = ASFR,
    x = Year,
    y = Age,
    wx, wy,
    region = isocode
  ) |>
  mutate(
    z = round(z, 6)
  ) |>
  mutate(across(c(x, y, wx, wy), as.integer))

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = fertilityrate_by_region,
  file = paths$output$fertilityrate_by_region.csv,
  na = "."
)
