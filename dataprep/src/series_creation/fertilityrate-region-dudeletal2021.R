# Create series fertilityrate-region-dudeletal2021
#
# Female fertility rates by region from Dudel et al. (2021).

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/fertilityrate-region-dudeletal2021.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)
library(ISOcodes)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = 'fertilityrate-region-dudeletal2021'
  source_key = 'dudeletal2021'
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path('dat', cnst$source_key, 'dudeletal2021.qs')
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  filter(sex == "f") |>
  left_join(ISO_3166_1, by = c(region = "Name")) |>
  mutate(Alpha_2 = case_when(
    .default = Alpha_2,
    # it's actually England and Wales
    region == "England" ~ "GB-EAW",
    region == "Germanyeast" ~ "DE-E",
    region == "Germanywest" ~ "DE-W",
    region == "Taiwan" ~ "TW",
    region == "USA" ~ "US"
  )) |>
  mutate(wx = 1, wy = 1) |>
  select(
    z = ASFR,
    x = Year,
    y = Age,
    wx, wy,
    region = Alpha_2
  )

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
