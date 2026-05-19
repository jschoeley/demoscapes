# Create Series of numberofkin by kin and region

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
    "./dat/gutierrezetal2023/numberofkin_by_type_region_period_age.qs"
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/numberofkin-kin_region-gutierrezetal2023.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load data ---------------------------------------------------------------

series_input <-
  qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  filter(!is.na(Alpha_2), Variant == 'Estimate') |>
  separate(col = year, into = c('year_start', 'year_end'), sep = '-') |>
  separate(col = age_focal, into = c('age_start', 'age_end'), sep = '-') |>
  mutate(across(c(year_start, year_end, age_start, age_end), as.integer)) |>
  mutate(
    kin = as.character(factor(kin, levels = DemoKin::demokin_codes$DemoKin,
                              labels = DemoKin::demokin_codes$Labels_2sex)),
    # year intervals are: from start up to end
    wx = year_end-year_start,
    # age intervals are from start up to and including end
    wy = age_end-age_start+1
  ) |>
  select(
    z = value,
    x = year_start,
    y = age_start,
    wx, wy,
    kin = kin,
    region = Alpha_2
  ) |>
  filter(!is.na(kin), !is.na(wx), !is.na(wy), !is.na(x), !is.na(y))

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
