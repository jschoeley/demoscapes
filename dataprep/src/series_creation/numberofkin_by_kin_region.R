# Create Series of numberofkin by kin and region

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(dplyr)
library(tidyr)
library(readr)

# Constants ---------------------------------------------------------------

# input and output paths
setwd(".")
paths <- list()
paths$input <- list(
  numberofkin_by_type_region_period_age.qs =
    "./dat/gutierrezetal2023/numberofkin_by_type_region_period_age.qs"
)
paths$output <- list(
  numberofkin_by_kin_region.qs =
    "./out/series_creation/numberofkin_by_kin_region.csv"
)

# constants specific to this analysis
cnst <- within(list(), {})

# Load data ---------------------------------------------------------------

numberofkin_by_type_region_period_age.qs <-
  qs_read(paths$input$numberofkin_by_type_region_period_age.qs)

# Create series -----------------------------------------------------------

numberofkin_by_kin_region.qs <-
  numberofkin_by_type_region_period_age.qs |>
  filter(!is.na(Alpha_2), Variant == 'Estimate') |>
  mutate(
    year = as.integer(substr(year, 1, 4)),
    age_focal = as.integer(substr(age_focal, 1, 1)),
    kin = as.character(factor(kin, levels = DemoKin::demokin_codes$DemoKin, labels = DemoKin::demokin_codes$Labels_2sex))
  ) |>
  filter(!is.na(kin)) |>
  select(
    z = value,
    x = year,
    y = age_focal,
    kin = kin,
    region = Alpha_2
  )

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = numberofkin_by_kin_region.qs,
  file = paths$output$numberofkin_by_kin_region.qs,
  na = "."
)
