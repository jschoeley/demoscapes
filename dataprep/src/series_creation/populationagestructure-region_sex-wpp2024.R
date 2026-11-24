# Create series populationagestructure-region_sex-wpp2024
#
# Shares across ages within each region, sex, and year, derived from the
# existing WPP population count CSV (whole persons). Female and Male each
# have their own denominator; Total describes the combined population.
# The final age group remains 100+, not a single-year age group.

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/populationagestructure-region_sex-wpp2024.R'); setwd(here::here())

library(dplyr)
library(readr)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- list(series_key = 'populationagestructure-region_sex-wpp2024')

# input and output paths
paths <- list(
  input = '../database/import/lexisdata/population/population-region_sex-wpp2024.csv',
  output = 'out/series_creation'
)

# Load series input -------------------------------------------------------

# Explicit character types preserve region codes such as Namibia's NA.
series_input <- read_csv(
  paths$input,
  col_types = cols(
    z = col_double(), x = col_double(), y = col_double(),
    wx = col_double(), wy = col_double(),
    region = col_character(), sex = col_character()
  ),
  na = '.',
  show_col_types = FALSE
)
stop_for_problems(series_input)

# Create series -----------------------------------------------------------

# Validate the source against its own metadata before deriving shares.
source_data <- ConstructLexisdata(
  series_input, series_key = 'population-region_sex-wpp2024'
)
ValidateLexisdata(source_data)
rm(source_data)

# Require all ages 0,...,99,100+ exactly once per region-sex-year. Never
# silently normalize an incomplete age distribution or ignore missing counts.
age_checks <- series_input |>
  group_by(region, sex, x) |>
  summarise(
    complete = n() == 101L && n_distinct(y) == 101L &&
      all(y %in% 0:100) && all(wy == 1),
    valid_counts = all(is.finite(z) & z >= 0),
    population = sum(z),
    .groups = 'drop'
  )
if (any(!age_checks$complete) || any(!age_checks$valid_counts) ||
    any(!is.finite(age_checks$population) | age_checks$population <= 0)) {
  stop('WPP age shares require complete ages 0-100, nonnegative finite counts, and positive population totals.')
}

series_output <- series_input |>
  group_by(region, sex, x) |>
  mutate(z = z / sum(z)) |>
  ungroup()

# Check the rounded values actually written by the shared exporter as well.
share_checks <- series_output |>
  group_by(region, sex, x) |>
  summarise(
    valid = all(is.finite(z) & z >= 0 & z <= 1),
    total = sum(RoundFloat(z)),
    .groups = 'drop'
  )
if (any(!share_checks$valid) || any(abs(share_checks$total - 1) > 1e-5)) {
  stop('WPP age shares must lie in [0, 1] and sum to one within each region-sex-year.')
}

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output
)
