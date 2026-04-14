# Create Series of birthcounts by region

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
  births_period_by_age.qs =
    "./dat/hfd/births_period_by_age.qs"
)
paths$output <- list(
  birthcount_by_region.csv =
    "./out/series_creation/birthcount_by_region.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HMD data -----------------------------------------------------------

hfd <- qs_read(paths$input$births_period_by_age.qs)

# Create series -----------------------------------------------------------

birthcount_by_region <-
  bind_rows(hfd) |>
  mutate(
    wx = 1,
    wy = 1
  ) |>
  select(
    z = Total,
    x = Year,
    y = Age,
    wx,
    wy,
    region = isocode
  ) |>
  mutate(
    z = as.integer(z),
    x = as.integer(x),
    y = as.integer(y),
    wx = as.integer(wx),
    wy = as.integer(wy)
  )

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = birthcount_by_region,
  file = paths$output$birthcount_by_region.csv,
  na = "."
)
