# Acquire and preformat data

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
library(dplyr)
library(tidyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = ""
})

# input and output paths
paths <- list()
paths$input <- list(
  secrets.yml = "./cfg/secrets.yml",
  url.csv = ""
)
paths$output <- list(
  downloaded_data_name.qs = paste0("./dat/", cnst$source_key, "/downloaded_data_name.qs"),
  preformatted_data_name.qs = paste0("./dat/", cnst$source_key, "/preformatted_data_name.qs")
)

secrets <- read_yaml(paths$input$secrets.yml)

# Download ----------------------------------------------------------------

download.file(
  url = paths$input$url.csv,
  destfile = paths$output$preformatted_data_name.qs,
  method = 'wget'
)

# Preformat ---------------------------------------------------------------

# get the data into the form of a single data frame

# Export ------------------------------------------------------------------

# export results of analysis
qs_save(preformatted_data_name, paths$output$preformatted_data_name.qs)
