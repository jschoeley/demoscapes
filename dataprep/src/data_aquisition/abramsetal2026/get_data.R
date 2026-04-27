# Acquire and preformat data

# Init --------------------------------------------------------------------

here::i_am('src/data_aquisition/abramsetal2026/get_data.R'); setwd(here::here())

library(yaml)
library(qs2)
library(osfr)
library(readr)
library(dplyr)
library(tidyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = "abramsetal2026"
})

# input and output paths
paths <- list()
paths$input <- list(
  secrets.yml = "./cfg/secrets.yml",
  osf.io = "xf57e"
)
paths$output <- list(
  osf_data_path = paste0("./dat/", cnst$source_key, '/'),
  abramsetal2026.qs = paste0("./dat/", cnst$source_key, "/abramsetal2026.qs")
)

secrets <- read_yaml(paths$input$secrets.yml)

# Download ----------------------------------------------------------------

osf_node <-
  osf_retrieve_node(paths$input$osf.io) |>
  osf_ls_files()

osf_download(
  osf_node,
  path = paths$output$osf_data_path,
  verbose = TRUE, recurse = TRUE, conflicts = "skip"
)

# Preformat ---------------------------------------------------------------

# get the data into the form of a single data frame
csvs <- grep(
  pattern = "Clean Data*.+csv$",
  x = list.files(paths$output$osf_data_path, recursive = TRUE),
  value = TRUE
)

x <- as.list(csvs)
abramsetal2026 <- lapply(x, function (x) {
  file <- paste0(paths$output$osf_data_path, x)
  read_csv(file)
}) |>
  bind_rows()

# Export ------------------------------------------------------------------

# export results of analysis
qs_save(abramsetal2026, paths$output$abramsetal2026.qs)
