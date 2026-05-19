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
  series_input.qs =
    "./dat/hmd-mortality/deathrates_period_by_age.qs"
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/deathrate-region_sex_subpopulation-hmd.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Functions ---------------------------------------------------------------

RoundFloat <- function (x) {
  signif(x, digits = 6)
}

# Load HMD data -----------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  bind_rows(series_input) |>
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
  mutate(
    x = as.integer(x),
    y = as.integer(y),
    wx = as.integer(wx),
    wy = as.integer(wy),
    z = RoundFloat(z)
  )

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
