# Acquire data from Kashnitsky et al. (2019)
#
# Cause of death with the largest contribution to premature male mortality
# by Mexican state, year, and age, from
# https://github.com/ikashnitsky/demres-geofacet

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/kashnitskyetal2019.R'); setwd(here::here())

library(qs2)
library(dplyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'kashnitskyetal2019'
})

# input and output paths
paths <- list()
paths$input <- list(
  codes.RData = 'https://github.com/ikashnitsky/demres-geofacet/raw/refs/heads/master/data/codes.RData',
  for_gg_nine.RData = 'https://github.com/ikashnitsky/demres-geofacet/raw/refs/heads/master/data/for-gg-nine.RData'
)
paths$output <- list(
  source_dir = file.path('dat', cnst$source_key),
  codes.RData = file.path('dat', cnst$source_key, 'codes.RData'),
  for_gg_nine.RData = file.path('dat', cnst$source_key, 'for_gg_nine.RData'),
  modalcodcontributiontoprematuremalemortality_by_state_period_age.qs = file.path(
    'dat', cnst$source_key,
    'modalcodcontributiontoprematuremalemortality_by_state_period_age.qs'
  )
)

dir.create(paths$output$source_dir, showWarnings = FALSE, recursive = TRUE)

# Download ----------------------------------------------------------------

download.file(paths$input$codes.RData, paths$output$codes.RData, mode = 'wb')
download.file(paths$input$for_gg_nine.RData, paths$output$for_gg_nine.RData, mode = 'wb')

# provides `codes` (state ids and names) and `df_nine` (modal causes by
# state id, year, and age)
load(paths$output$codes.RData)
load(paths$output$for_gg_nine.RData)

# Preformat ---------------------------------------------------------------

modalcodcontributiontoprematuremalemortality_by_state_period_age <-
  df_nine |>
  left_join(mutate(codes, id = as.integer(id)), by = c('code' = 'id')) |>
  select(state = name, year, age, cause_name)

# Export ------------------------------------------------------------------

qs_save(
  modalcodcontributiontoprematuremalemortality_by_state_period_age,
  paths$output$modalcodcontributiontoprematuremalemortality_by_state_period_age.qs
)
