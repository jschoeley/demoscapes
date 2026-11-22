# Acquire data from Abrams et al. (2026)
#
# Mortality rates and annual mortality change by cause of death, sex, year,
# and age, from the OSF project https://osf.io/xf57e/

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/abramsetal2026.R'); setwd(here::here())

library(qs2)
library(osfr)
library(readr)
library(dplyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'abramsetal2026'
  osf_node = 'xf57e'
})

# input and output paths
paths <- list()
paths$output <- list(
  source_dir = file.path('dat', cnst$source_key),
  abramsetal2026.qs = file.path('dat', cnst$source_key, 'abramsetal2026.qs')
)

dir.create(paths$output$source_dir, showWarnings = FALSE, recursive = TRUE)

# Download ----------------------------------------------------------------

osf_retrieve_node(cnst$osf_node) |>
  osf_ls_files() |>
  osf_download(
    path = paths$output$source_dir,
    verbose = TRUE, recurse = TRUE, conflicts = 'skip'
  )

# Preformat ---------------------------------------------------------------

# one csv per cause and sex, named <cause>_<sex>_ROMI.csv
csvs <- grep(
  pattern = 'Clean Data*.+csv$',
  x = list.files(paths$output$source_dir, recursive = TRUE),
  value = TRUE
)

abramsetal2026 <-
  lapply(csvs, function (x) {
    dfr <- read_csv(file.path(paths$output$source_dir, x), show_col_types = FALSE)
    dfr <- dfr[, c('Year', 'Age', 'Mx', 'Mx_change_year')]
    filename <- stringr::str_extract(x, '[A-Za-z ]+_[fm]_ROMI.csv$')
    dfr$cause <- strsplit(filename, split = '_')[[1]][1]
    dfr$sex <- strsplit(filename, split = '_')[[1]][2]
    dfr
  }) |>
  bind_rows()

# Export ------------------------------------------------------------------

qs_save(abramsetal2026, paths$output$abramsetal2026.qs)
