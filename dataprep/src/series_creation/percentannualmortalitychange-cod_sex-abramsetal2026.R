# Create series percentannualmortalitychange-cod_sex-abramsetal2026
#
# Annual percent change in mortality by cause of death and sex from Abrams
# et al. (2026).

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/percentannualmortalitychange-cod_sex-abramsetal2026.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = 'percentannualmortalitychange-cod_sex-abramsetal2026'
  source_key = 'abramsetal2026'
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path('dat', cnst$source_key, 'abramsetal2026.qs')
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  # first and last year don't have percent change
  filter(!Year %in% c(1979, 2020)) |>
  # somehow the signs were flipped, turn % mortality improvements
  # into % mortality change
  mutate(Mx_change_year = -Mx_change_year) |>
  mutate(
    sex = case_when(
      sex == 'f' ~ 'Female',
      sex == 'm' ~ 'Male'
    ),
    wx = 1, wy = 1
  ) |>
  select(
    z = Mx_change_year,
    x = Year,
    y = Age,
    wx, wy,
    codabramsetal2026 = cause,
    sex = sex
  ) |>
  filter(!is.na(sex), !is.na(codabramsetal2026))

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
