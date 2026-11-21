# Create series cohabitiontomarriagerate-region_sex_model-carollo2025
#
# Rate of transition from cohabitation to marriage by region, sex, and model
# from Carollo (2025).

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/cohabitiontomarriagerate-region_sex_model-carollo2026.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = 'cohabitiontomarriagerate-region_sex_model-carollo2025'
  source_key = 'carollo2025'
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path(
    'dat', cnst$source_key,
    'cohabitiontomarriagerate_by_region_sex_model_age_duration.qs'
  )
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  mutate(
    wx = round(wx, 1),
    wy = round(wy, 1),
    sex = case_when(
      sex == "men" ~ "Male",
      sex == "wowen" ~ "Female"
    ),
    region = case_when(
      region == "east" ~ "DE-E",
      region == "west" ~ "DE-W"
    )
  ) |>
  select(
    z = z,
    x = x,
    y = y,
    wx, wy,
    region = region,
    sex = sex,
    modelcarollo2025 = model
  )

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
