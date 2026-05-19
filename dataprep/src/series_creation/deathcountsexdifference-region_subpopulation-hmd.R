# Create Series of deathcount sex differences by region, and subpopulation

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
  series_input.qs = "./dat/hmd-mortality/deaths_period_by_age.qs"
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/deathcountsexdifference-region_subpopulation-hmd.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HMD data -----------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  bind_rows(series_input) |>
  mutate(
    value = Male - Female,
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
    x = as.integer(x),
    y = as.integer(y),
    wx = as.integer(wx),
    wy = as.integer(wy),
    z = round(z, 0)
  )

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
