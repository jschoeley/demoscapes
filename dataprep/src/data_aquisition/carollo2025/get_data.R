# Acquire and preformat data

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(readr)
library(dplyr)
library(tidyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = "carollo2025"
})

# input and output paths
paths <- list()
paths$input <- list(
  secrets.yml = "./cfg/secrets.yml",
  Marriage.csv = "./dat/carollo2025/Marriage.csv"
)
paths$output <- list(
  cohabitiontomarriagerate_by_region_sex_model_age_duration.qs =
    paste0("./dat/", cnst$source_key, "/cohabitiontomarriagerate_by_region_sex_model_age_duration.qs")
)

#secrets <- read_yaml(paths$input$secrets.yml)

# Download ----------------------------------------------------------------

marriage.csv <- read_csv(paths$input$Marriage.csv)

# Preformat ---------------------------------------------------------------

# get the data into the form of a single data frame
cohabitiontomarriagerate_by_region_sex_model_age_duration <-
  marriage.csv |>
  select(-1)

# Export ------------------------------------------------------------------

# export results of analysis
qs_save(
  cohabitiontomarriagerate_by_region_sex_model_age_duration,
  paths$output$cohabitiontomarriagerate_by_region_sex_model_age_duration.qs
)
