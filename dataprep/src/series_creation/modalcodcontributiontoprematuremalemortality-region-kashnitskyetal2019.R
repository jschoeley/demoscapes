# Create Series of modalcodcontributiontoprematuremalemortality by region,
# across period and age

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(dplyr)
library(tidyr)
library(readr)
library(ISOcodes)

# Constants ---------------------------------------------------------------

# input and output paths
setwd(".")
paths <- list()
paths$input <- list(
  series_input.qs =
    "./dat/kashnitskyetal2019/modalcodcontributiontoprematuremalemortality_by_state_period_age.qs"
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/modalcodcontributiontoprematuremalemortality-region-kashnitskyetal2019.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load data ---------------------------------------------------------------

series_input <-
  qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  mutate(across(c(year, age), as.integer)) |>
  mutate(across(c(state, cause_name), as.character)) |>
  mutate(
    cause_name = stringr::str_replace_all(cause_name, "\n", " ")
  ) |>
  mutate(
    state = case_when(
      state == "Coahuila" ~ "Coahuila de Zaragoza",
      state == "Michoacán" ~ "Michoacán de Ocampo",
      state == "Veracruz" ~ "Veracruz de Ignacio de la Llave",
      state == "Distrito Federal" ~ "Ciudad de México",
      .default = state
    )
  ) |>
  left_join(ISO_3166_2, by = c("state" = "Name")) |>
  mutate(
    # year intervals are: from start up to end
    wx = 1L,
    # age intervals are from start up to and including end
    wy = 1L
  ) |>
  select(
    z = cause_name,
    x = year,
    y = age,
    wx, wy,
    region = Code
  ) |>
  filter(!is.na(region), !is.na(wx), !is.na(wy), !is.na(x), !is.na(y)) |>
  arrange(region, x, y)

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
