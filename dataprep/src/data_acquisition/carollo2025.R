# Acquire data from Carollo (2025)
#
# Rates of transition from cohabitation to marriage by region, sex, model,
# age, and duration. The file Marriage.csv is not publicly available; place it
# into dat/carollo2025/ by hand before running this script.

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/carollo2025.R'); setwd(here::here())

library(qs2)
library(readr)
library(dplyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'carollo2025'
})

# input and output paths
paths <- list()
paths$input <- list(
  Marriage.csv = file.path('dat', cnst$source_key, 'Marriage.csv')
)
paths$output <- list(
  cohabitiontomarriagerate_by_region_sex_model_age_duration.qs = file.path(
    'dat', cnst$source_key,
    'cohabitiontomarriagerate_by_region_sex_model_age_duration.qs'
  )
)

# Load --------------------------------------------------------------------

if (!file.exists(paths$input$Marriage.csv)) {
  stop('Place Marriage.csv into dat/carollo2025/ first.', call. = FALSE)
}
marriage <- read_csv(paths$input$Marriage.csv)

# Preformat ---------------------------------------------------------------

# drop the row number column
cohabitiontomarriagerate_by_region_sex_model_age_duration <-
  marriage |>
  select(-1)

# Export ------------------------------------------------------------------

qs_save(
  cohabitiontomarriagerate_by_region_sex_model_age_duration,
  paths$output$cohabitiontomarriagerate_by_region_sex_model_age_duration.qs
)
