# Preformat data on Kinship counts
# https://doi.org/10.7910/DVN/FKCRHW

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(dplyr)
library(tidyr)
library(ISOcodes)

# Constants ---------------------------------------------------------------

# input and output paths
paths <- list()
paths$input <- list(
  table_data_agg.csv = "./dat/gutierrezetal2023/table_data_agg.csv",
  region.yaml = "./out/codebook_definition/region.yaml"
  #secrets.yml = "./cfg/secrets.yml"
)
paths$output <- list(
  numberofkin_by_type_region_period_age.qs = "./dat/gutierrezetal2023/numberofkin_by_type_region_period_age.qs"
)

# constants specific to this analysis
cnst <- within(list(), {
  regioncodes <- read_yaml(paths$input$region.yaml)
})

#secrets <- read_yaml(paths$input$secrets.yml)

# Load kinship count data -------------------------------------------------

kinship <- read.csv(paths$input$table_data_agg.csv)

# Pivot long and code country names ---------------------------------------

numberofkin_by_type_region_period_age.qs <-
  kinship |>
  pivot_longer(
    cols = matches("^[[:upper:]]{3}$", ignore.case = FALSE, perl = TRUE),
    names_to = "iso3"
  ) |>
  left_join(ISO_3166_1, by = c("iso3" = "Alpha_3"))

# Export ------------------------------------------------------------------

# export results of analysis
qs_save(numberofkin_by_type_region_period_age.qs, paths$output$numberofkin_by_type_region_period_age.qs)
