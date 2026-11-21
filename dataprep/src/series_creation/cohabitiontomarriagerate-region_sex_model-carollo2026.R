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
  measure_key = "cohabitiontomarriagerate"
  strata_keys = c("region", "sex", "modelcarollo2025")
  source_key = "carollo2025"
})

# input and output paths
paths <- list()
paths$input <- list(
  global_objects.R = 'src/_global_objects.R',
  series_input.qs =
    paste0("./dat/", cnst$source_key, "/cohabitiontomarriagerate_by_region_sex_model_age_duration.qs")
)
paths$output <- list(
  series_output_path =
    "./out/series_creation/"
)

source(paths$input$global_objects.R)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
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
    wx = round(wx, 1),
    wy = round(wy, 1),
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
  )

# Export ------------------------------------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  z = 'z', x = 'x', y = 'y', wx = 'wx', wy = 'wy',
  strata = cnst$strata_keys,
  measure = cnst$measure_key,
  source = cnst$source_key,
  path = paths$output$series_output_path
)
