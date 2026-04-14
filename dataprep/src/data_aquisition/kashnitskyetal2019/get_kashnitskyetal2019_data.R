# Preformat data on Mexican cod contributions to premature male mortality
# https://github.com/ikashnitsky/demres-geofacet/blob/master/data/for-gg-nine.RData

# Init --------------------------------------------------------------------

library(qs2)
library(dplyr)
library(tidyr)

# Constants ---------------------------------------------------------------

# input and output paths
paths <- list()
paths$input <- list(
  codes.RData = "https://github.com/ikashnitsky/demres-geofacet/raw/refs/heads/master/data/codes.RData",
  for_gg_nine.RData = "https://github.com/ikashnitsky/demres-geofacet/raw/refs/heads/master/data/for-gg-nine.RData"
)
paths$output <- list(
  codes.RData = "./dat/kashnitskyetal2019/codes.RData",
  for_gg_nine.RData = "./dat/kashnitskyetal2019/for_gg_nine.RData",
  modalcodcontributiontoprematuremalemortality_by_state_period_age.qs = "./dat/kashnitskyetal2019/modalcodcontributiontoprematuremalemortality_by_state_period_age.qs"
)

# constants specific to this analysis
cnst <- within(list(), {
})

#secrets <- read_yaml(paths$input$secrets.yml)

# Download data -----------------------------------------------------------

download.file(
  url = paths$input$codes.RData,
  destfile = paths$output$codes.RData,
  method = 'wget'
)
download.file(
  url = paths$input$for_gg_nine.RData,
  destfile = paths$output$for_gg_nine.RData,
  method = 'wget'
)

load(paths$output$codes.RData)
load(paths$output$for_gg_nine.RData)

# join with state names ---------------------------------------------------

modalcodcontributiontoprematuremalemortality_by_state_period_age.qs <-
  df_nine |>
  left_join(mutate(codes, id = as.integer(id)), by = c("code" = "id")) |>
  select(state = name, year, age, cause_name)

# Export ------------------------------------------------------------------

# export results of analysis
qs_save(
  modalcodcontributiontoprematuremalemortality_by_state_period_age.qs,
  paths$output$modalcodcontributiontoprematuremalemortality_by_state_period_age.qs
)
