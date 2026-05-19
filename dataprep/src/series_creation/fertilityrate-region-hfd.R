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
  series_input.qs =
    "./dat/hfd/fertilityrates_period_by_age.qs"
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/fertilityrate-region-hfd.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HFD data -----------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  bind_rows(series_input) |>
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
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
