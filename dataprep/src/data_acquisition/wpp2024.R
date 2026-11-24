# Acquire data from the UN World Population Prospects 2024 (WPP 2024)
#
# Population on 1 January by country, sex, and single year of age: estimates
# 1950-2023 and medium-variant projections 2024-2100, from
# https://population.un.org/wpp/downloads?folder=Standard%20Projections&group=CSV%20format
#
# United Nations, Department of Economic and Social Affairs, Population
# Division (2024). World Population Prospects 2024.

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/wpp2024.R'); setwd(here::here())

library(qs2)
library(dplyr)
library(readr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'wpp2024'
  base_url = paste0(
    'https://population.un.org/wpp/assets/Excel%20Files/',
    '1_Indicator%20(Standard)/CSV_FILES/'
  )
  file_estimates = 'WPP2024_Population1JanuaryBySingleAgeSex_Medium_1950-2023.csv.gz'
  file_projections = 'WPP2024_Population1JanuaryBySingleAgeSex_Medium_2024-2100.csv.gz'
  # the files are large
  download_timeout_seconds = 3600
})

# input and output paths
paths <- list()
paths$input <- list(
  estimates.csv.gz = paste0(cnst$base_url, cnst$file_estimates),
  projections.csv.gz = paste0(cnst$base_url, cnst$file_projections)
)
paths$output <- list(
  source_dir = file.path('dat', cnst$source_key),
  estimates.csv.gz = file.path('dat', cnst$source_key, cnst$file_estimates),
  projections.csv.gz = file.path('dat', cnst$source_key, cnst$file_projections),
  population_by_single_age_sex.qs =
    file.path('dat', cnst$source_key, 'population_by_single_age_sex.qs')
)

dir.create(paths$output$source_dir, showWarnings = FALSE, recursive = TRUE)

# Download ----------------------------------------------------------------

options(timeout = max(cnst$download_timeout_seconds, getOption('timeout')))

# Skip files that are already there. Downloads go to a temporary file first so
# that an interrupted download is not mistaken for a complete one.
DownloadIfMissing <- function (url, destfile) {
  if (file.exists(destfile)) {
    cat('Already downloaded:', destfile, '\n')
    return(invisible(destfile))
  }
  partial_file <- paste0(destfile, '.part')
  on.exit(unlink(partial_file))
  status <- download.file(url = url, destfile = partial_file, mode = 'wb')
  if (status != 0) stop('Download failed: ', url, call. = FALSE)
  if (!file.rename(partial_file, destfile)) {
    stop('Could not write ', destfile, call. = FALSE)
  }
  invisible(destfile)
}

DownloadIfMissing(paths$input$estimates.csv.gz, paths$output$estimates.csv.gz)
DownloadIfMissing(paths$input$projections.csv.gz, paths$output$projections.csv.gz)

# Preformat ---------------------------------------------------------------

ReadWPP <- function (file) {
  read_csv(
    file,
    na = '', # Only empty fields are missing: Namibia's ISO code is the string "NA".
    col_select = c(
      ISO2_code, LocTypeName, Time, AgeGrpStart,
      PopMale, PopFemale, PopTotal
    ),
    col_types = cols(
      ISO2_code = col_character(),
      LocTypeName = col_character(),
      Time = col_integer(),
      AgeGrpStart = col_integer(),
      PopMale = col_double(),
      PopFemale = col_double(),
      PopTotal = col_double(),
      .default = col_skip()
    ),
    progress = FALSE
  ) |>
    filter(LocTypeName == 'Country/Area')
}

population_by_single_age_sex <-
  bind_rows(
    estimates = ReadWPP(paths$output$estimates.csv.gz),
    projections = ReadWPP(paths$output$projections.csv.gz),
    .id = 'period_type'
  )

# Export ------------------------------------------------------------------

qs_save(
  population_by_single_age_sex,
  paths$output$population_by_single_age_sex.qs
)
