# Acquire and preformat data

# Init --------------------------------------------------------------------

here::i_am('src/data_aquisition/dudeletal2021/get_data.R'); setwd(here::here())

library(yaml)
library(qs2)
library(osfr)
library(readr)
library(dplyr)
library(tidyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = "dudeletal2021"
})

# input and output paths
paths <- list()
paths$input <- list(
  secrets.yml = "./cfg/secrets.yml",
  osf.io = "en6fk"
)
paths$output <- list(
  osf_data_path = paste0("./dat/", cnst$source_key, '/'),
  dudeletal2021.qs = paste0("./dat/", cnst$source_key, "/dudeletal2021.qs")
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

unzip('dat/dudeletal2021/repro_materials.zip',
      exdir = paths$output$osf_data_path)

# get the data into the form of a single data frame
csvs <- grep(
  pattern = "ASFR.+_m\\.txt$",
  x = list.files(paths$output$osf_data_path, recursive = TRUE),
  value = TRUE
)

x <- as.list(csvs)
dudeletal2021 <- lapply(x, function (x) {
  file <- paste0(paths$output$osf_data_path, x)
  dfr <- read_tsv(file)
  dfr <- dfr[,c('Year', 'Age', 'ASFR')]
  filename <- stringr::str_extract(x, 'ASFR_.+_m.txt$')
  dfr$region <- strsplit(filename, split = '_')[[1]][2]
  dfr
}) |>
  bind_rows()

# Export ------------------------------------------------------------------

# export results of analysis
qs_save(dudeletal2021, paths$output$dudeletal2021.qs)
