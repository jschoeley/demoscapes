# Create series modalcodcontributiontoprematuremalemortality-region-kashnitskyetal2019
#
# Cause of death with the largest contribution to premature male mortality
# by Mexican state from Kashnitsky et al. (2019).

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/modalcodcontributiontoprematuremalemortality-region-kashnitskyetal2019.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)
library(ISOcodes)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = 'modalcodcontributiontoprematuremalemortality-region-kashnitskyetal2019'
  source_key = 'kashnitskyetal2019'
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path('dat', cnst$source_key, 'modalcodcontributiontoprematuremalemortality_by_state_period_age.qs')
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  mutate(across(c(state, cause_name), as.character)) |>
  # year is stored as text
  mutate(year = as.integer(year)) |>
  mutate(
    cause_name = gsub('\n', ' ', cause_name, fixed = TRUE),
    # match state names to ISO 3166-2
    state = case_when(
      state == "Coahuila" ~ "Coahuila de Zaragoza",
      state == "Michoacán" ~ "Michoacán de Ocampo",
      state == "Veracruz" ~ "Veracruz de Ignacio de la Llave",
      state == "Distrito Federal" ~ "Ciudad de México",
      .default = state
    )
  ) |>
  left_join(ISO_3166_2, by = c("state" = "Name")) |>
  mutate(wx = 1, wy = 1) |>
  select(
    z = cause_name,
    x = year,
    y = age,
    wx, wy,
    region = Code
  ) |>
  filter(!is.na(region), !is.na(x), !is.na(y))

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
