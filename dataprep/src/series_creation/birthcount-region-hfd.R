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
  series_input.qs =
    "./dat/hfd/births_period_by_age.qs"
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/birthcount-region-hfd.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HMD data -----------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  bind_rows(series_input) |>
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
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
