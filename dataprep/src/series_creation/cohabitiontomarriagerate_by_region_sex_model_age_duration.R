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
  source_key = "carollo2025"
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs =
    paste0("./dat/", cnst$source_key, "/cohabitiontomarriagerate_by_region_sex_model_age_duration.qs")
)
paths$output <- list(
  series_name.csv =
    "./out/series_creation/cohabitiontomarriagerate_by_region_sex_model_age_duration.csv"
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
    region = region,
    sex = sex,
    modelcarollo2025 = model
  ) |>
  mutate(
    sex = case_when(
      sex == "men" ~ "Male",
      sex == "wowen" ~ "Female",
      .default = NA
    )
  ) |>
  mutate(
    region = case_when(
      region == "east" ~ "DE-E",
      region == "west" ~ "DE-W",
      .default = NA
    )
  ) |>
  mutate(across(where(is.factor), as.character)) |>
  mutate(across(c(x, y, wx, wy), RoundFloat)) |>
  mutate(across(c(z), RoundFloat))

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_name,
  file = paths$output$series_name.csv,
  na = "."
)
