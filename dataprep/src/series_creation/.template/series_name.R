# Create Series

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(readr)
library(dplyr)
library(tidyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = ""
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs =
    paste0("./dat/", cnst$source_key, "/series_input.qs")
)
paths$output <- list(
  series_name.csv =
    "./out/series_creation/series_name.csv"
)

# Functions ---------------------------------------------------------------

RoundFloat <- function (x) {
  signif(x, digits = 6)
}

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_name <-
  series_input |>
  select(
    z = z,
    x = x,
    y = y,
    wx,
    wy,
    stratum1 = stratum1
  ) |>
  mutate(
    z = as.integer(z),
    x = as.integer(x),
    y = as.integer(y),
    wx = as.integer(wx),
    wy = as.integer(wy)
  ) |>
  mutate(across(where(is.factor), as.character)) |>
  mutate(across(c(x, y, wx, wy), as.integer)) |>
  mutate(across(c(z), RoundFloat))

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_name,
  file = paths$output$series_name.csv,
  na = "."
)
