# Acquire data from Dudel et al. (2021)
#
# Female and male age-specific fertility rates by country and year, from the
# reproduction materials in the OSF project https://osf.io/en6fk/

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/dudeletal2021.R'); setwd(here::here())

library(qs2)
library(osfr)
library(readr)
library(dplyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'dudeletal2021'
  osf_node = 'en6fk'
})

# input and output paths
paths <- list()
paths$output <- list(
  source_dir = file.path('dat', cnst$source_key),
  repro_materials.zip = file.path('dat', cnst$source_key, 'repro_materials.zip'),
  dudeletal2021.qs = file.path('dat', cnst$source_key, 'dudeletal2021.qs')
)

dir.create(paths$output$source_dir, showWarnings = FALSE, recursive = TRUE)

# Download ----------------------------------------------------------------

osf_retrieve_node(cnst$osf_node) |>
  osf_ls_files() |>
  osf_download(
    path = paths$output$source_dir,
    verbose = TRUE, recurse = TRUE, conflicts = 'skip'
  )

unzip(paths$output$repro_materials.zip, exdir = paths$output$source_dir)

# Preformat ---------------------------------------------------------------

# one file per region and sex, named ASFR_<region>_<sex>.txt
txts <- grep(
  pattern = 'ASFR.+_[mf]\\.txt$',
  x = list.files(paths$output$source_dir, recursive = TRUE),
  value = TRUE
)

dudeletal2021 <-
  lapply(txts, function (x) {
    dfr <- read_tsv(file.path(paths$output$source_dir, x), show_col_types = FALSE)
    dfr <- dfr[, c('Year', 'Age', 'ASFR')]
    filename <- stringr::str_extract(x, 'ASFR_.+_[mf].txt$')
    dfr$region <- strsplit(filename, split = '_')[[1]][2]
    dfr$sex <- substr(strsplit(filename, split = '_')[[1]][3], 1, 1)
    dfr
  }) |>
  bind_rows()

# Export ------------------------------------------------------------------

qs_save(dudeletal2021, paths$output$dudeletal2021.qs)
