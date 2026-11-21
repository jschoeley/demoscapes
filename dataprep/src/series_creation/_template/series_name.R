# Create series <series_key>
#
# Copy this file to src/series_creation/<series_key>.R, where <series_key> is
# the key of the series in database/import/metadata/series.yml, e.g.
# deathrate-region_sex_subpopulation-hmd. The measure, source, and strata of
# the series are looked up in series.yml by the shared helpers in
# src/_global_objects.R, which also validate the output against the metadata.

# Init --------------------------------------------------------------------

here::i_am('src/series_creation/_template/series_name.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)

source('src/_global_objects.R')

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  series_key = '<measure>-<strata>-<source>'
  source_key = '<source>'
})

# input and output paths
paths <- list()
paths$input <- list(
  series_input.qs = file.path('dat', cnst$source_key, 'series_input.qs')
)
paths$output <- list(
  series_output_dir = 'out/series_creation'
)

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

# Produce one row per lexis cell with the columns
#   z         cell value (numeric, or character for categorical measures)
#   x, y      lower left corner of the cell (e.g. year and age)
#   wx, wy    width of the cell along x and y
#   <strata>  one column per strata key of the series, holding codebook keys
# Rounding, type conversion, and sorting are done by the helpers below.
series_output <-
  series_input |>
  mutate(wx = 1, wy = 1) |>
  select(
    z = value,
    x = year,
    y = age,
    wx, wy,
    region = region
  )

# Construct, validate, and export -----------------------------------------

ConstructValidateExportLexisdata(
  series_output,
  series_key = cnst$series_key,
  path = paths$output$series_output_dir
)
