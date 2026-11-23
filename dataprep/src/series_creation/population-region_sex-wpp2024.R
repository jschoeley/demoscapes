# Create series population-region_sex-wpp2024
#
# Population on 1 January by country, sex, and single year of age from the UN
# World Population Prospects 2024: estimates 1950-2023 and medium-variant
# projections 2024-2100. The open age group 100+ is stored at age 100 with a
# cell width of 1, as in the HMD series.

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/population-region_sex-wpp2024.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = 'population-region_sex-wpp2024'
  source_key = 'wpp2024'
  # the projection file also holds 1 January 2101
  last_year = 2100
  # WPP reports population in thousands
  persons_per_unit = 1000
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path('dat', cnst$source_key, 'population_by_single_age_sex.qs')
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  filter(Time <= cnst$last_year) |>
  select(
    region = ISO2_code,
    x = Time,
    y = AgeGrpStart,
    Female = PopFemale,
    Male = PopMale,
    Total = PopTotal
  ) |>
  pivot_longer(
    cols = c(Female, Male, Total),
    names_to = 'sex',
    values_to = 'z'
  ) |>
  # whole persons, which also removes floating point noise from the scaling
  mutate(z = round(z * cnst$persons_per_unit), wx = 1, wy = 1) |>
  select(z, x, y, wx, wy, region, sex)

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
