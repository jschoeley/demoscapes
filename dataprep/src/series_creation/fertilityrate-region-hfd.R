# Create series fertilityrate-region-hfd
#
# Fertility rates by region from the Human Fertility Database.

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/fertilityrate-region-hfd.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = 'fertilityrate-region-hfd'
  source_key = 'hfd'
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path('dat', cnst$source_key, 'fertilityrates_period_by_age.qs')
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  bind_rows(series_input) |>
  mutate(wx = 1, wy = 1) |>
  select(
    z = ASFR,
    x = Year,
    y = Age,
    wx, wy,
    region = isocode
  )

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
