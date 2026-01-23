# Create Series of deathcount sex differences by region, and subpopulation

# Init --------------------------------------------------------------------

library(yaml)
library(qs)
library(dplyr)
library(tidyr)
library(readr)

# Constants ---------------------------------------------------------------

# input and output paths
setwd(".")
paths <- list()
paths$input <- list(
  deaths_period_by_age.qs = "./dat/hmd-mortality/deaths_period_by_age.qs"
)
paths$output <- list(
  deathcountsexdifference_by_region_subpopulation.csv =
    "./out/series_creation/deathcountsexdifference_by_region_subpopulation.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load HMD data -----------------------------------------------------------

hmd <- qread(paths$input$deaths_period_by_age.qs)

# Create series -----------------------------------------------------------

deathcountsexdifference_by_region_subpopulation <-
  bind_rows(hmd) |>
  mutate(value = Male - Female) |>
  select(
    z = value,
    x = Year,
    y = Age,
    region = isocode,
    subpopulation = subpopulation
  ) |>
  mutate(
    z = round(z, 3)
  )

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = deathcountsexdifference_by_region_subpopulation,
  file = paths$output$deathcountsexdifference_by_region_subpopulation.csv,
  na = "."
)
