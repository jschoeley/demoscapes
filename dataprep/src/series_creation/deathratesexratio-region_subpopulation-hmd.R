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
  series_input.qs = "./dat/hmd-mortality/deathrates_period_by_age.qs"
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/deathratesexratio-region_subpopulation-hmd.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Functions ---------------------------------------------------------------

RoundFloat <- function (x) {
  signif(x, digits = 6)
}

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  bind_rows(series_input) |>
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
  mutate(across(where(is.factor), as.character)) |>
  mutate(across(c(x, y, wx, wy), as.integer)) |>
  mutate(across(c(z), RoundFloat))

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
