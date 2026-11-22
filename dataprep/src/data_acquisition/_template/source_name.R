# Acquire data from <source>
#
# Copy this file to src/data_acquisition/<source_key>.R, where <source_key> is
# the key of the data source in database/import/metadata/sources.yml, e.g.
# hmd. The script downloads the raw data into dat/<source_key>/ and saves the
# preformatted data there as .qs files, which the series creation scripts
# read. Data that cannot be downloaded automatically is placed into
# dat/<source_key>/ by hand; document where to get it below.
#
# <citation or URL of the data source>

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/_template/source_name.R'); setwd(here::here())

library(yaml)
library(qs2)
library(dplyr)
library(tidyr)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = '<source>'
})

# input and output paths
paths <- list()
paths$input <- list(
  # credentials, only needed for sources that require a login
  secrets.yml = 'cfg/secrets.yml',
  data.csv = 'https://example.org/data.csv'
)
paths$output <- list(
  source_dir = file.path('dat', cnst$source_key),
  data.csv = file.path('dat', cnst$source_key, 'data.csv'),
  data.qs = file.path('dat', cnst$source_key, 'data.qs')
)

dir.create(paths$output$source_dir, showWarnings = FALSE, recursive = TRUE)

# Download ----------------------------------------------------------------

download.file(
  url = paths$input$data.csv,
  destfile = paths$output$data.csv,
  mode = 'wb'
)

# Preformat ---------------------------------------------------------------

# bring the raw data into the form of a single data frame
data <-
  read.csv(paths$output$data.csv)

# Export ------------------------------------------------------------------

qs_save(data, paths$output$data.qs)
