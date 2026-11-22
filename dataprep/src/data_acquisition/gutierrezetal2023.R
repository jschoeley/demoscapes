# Acquire data from Gutierrez et al. (2023)
#
# Expected number of living kin by type of kin, country, period, and age.
# Download table_data_agg.csv from https://doi.org/10.7910/DVN/FKCRHW and
# place it into dat/gutierrezetal2023/ by hand before running this script.

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/gutierrezetal2023.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(tidyr)
library(ISOcodes)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'gutierrezetal2023'
})

# input and output paths
paths <- list()
paths$input <- list(
  table_data_agg.csv = file.path('dat', cnst$source_key, 'table_data_agg.csv')
)
paths$output <- list(
  numberofkin_by_type_region_period_age.qs = file.path(
    'dat', cnst$source_key, 'numberofkin_by_type_region_period_age.qs'
  )
)

# Load --------------------------------------------------------------------

if (!file.exists(paths$input$table_data_agg.csv)) {
  stop('Place table_data_agg.csv into dat/gutierrezetal2023/ first.', call. = FALSE)
}
kinship <- read.csv(paths$input$table_data_agg.csv)

# Preformat ---------------------------------------------------------------

# one column per country, named by ISO 3166-1 alpha-3 code; pivot long and
# add the other ISO codes
numberofkin_by_type_region_period_age <-
  kinship |>
  pivot_longer(
    cols = matches('^[[:upper:]]{3}$', ignore.case = FALSE, perl = TRUE),
    names_to = 'iso3'
  ) |>
  left_join(ISO_3166_1, by = c('iso3' = 'Alpha_3'))

# Export ------------------------------------------------------------------

qs_save(
  numberofkin_by_type_region_period_age,
  paths$output$numberofkin_by_type_region_period_age.qs
)
