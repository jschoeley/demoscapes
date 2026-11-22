# Create series deathrate-region_sex_subpopulation-hmd
#
# Death rates by region, sex, and subpopulation from the Human Mortality
# Database.

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/deathrate-region_sex_subpopulation-hmd.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = 'deathrate-region_sex_subpopulation-hmd'
  source_key = 'hmd'
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path('dat', cnst$source_key, 'deathrates_period_by_age.qs')
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  bind_rows(series_input) |>
  pivot_longer(cols = c(Female, Male, Total), names_to = 'sex') |>
  mutate(wx = 1, wy = 1) |>
  select(
    z = value,
    x = Year,
    y = Age,
    wx, wy,
    region = isocode,
    sex = sex,
    subpopulation = subpopulation
  )

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
