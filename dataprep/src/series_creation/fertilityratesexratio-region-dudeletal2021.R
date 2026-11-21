# Create Series

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(readr)
library(dplyr)
library(tidyr)
library(ISOcodes)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = "dudeletal2021"
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs =
    paste0("./dat/", cnst$source_key, "/dudeletal2021.qs")
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/fertilityratesexratio-region-dudeletal2021.csv"
)

# Functions ---------------------------------------------------------------

RoundFloat <- function (x) {
  signif(x, digits = 6)
}

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  filter(
    sex %in% c("m", "f"),
    Age >= 15, Age <= 50
  ) |>
  left_join(ISO_3166_1, by = c(region = "Name")) |>
  mutate(Alpha_2 = case_when(
    .default = Alpha_2,
    # it's actually England and Wales
    region == "England" ~ "GB-EAW",
    region == "Germanyeast" ~ "DE-E",
    region == "Germanywest" ~ "DE-W",
    region == "Taiwan" ~ "TW",
    region == "USA" ~ "US"
  )) |>
  pivot_wider(names_from = "sex", values_from = "ASFR") |>
  mutate(
    value = ifelse(f == 0, NA, m / f),
    wx = 1, wy = 1
  ) |>
  select(
    z = value,
    x = Year,
    y = Age,
    wx = wx,
    wy = wy,
    region = Alpha_2
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
