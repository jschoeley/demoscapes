# Global constants and functions

ConstructLexisdata <- function (
    df,
    z, x, y, wx, wy, strata,
    measure, source
) {

  # ensure correct variable naming and order
  core <-
    data.frame(
      z = df[[z]],
      x = df[[x]],
      y = df[[y]],
      wx = df[[wx]],
      wy = df[[wy]]
    )
  stratification <-
    df[strata]
  series <-
    cbind(core, stratification)

  # ensure columns are numeric or character
  numcols <- which(sapply(series, is.numeric))
  faccols <- which(sapply(series, is.factor))

  if (length(faccols) > 0) {
    for (j in faccols) {
      series[,j] <- as.character(series[,j])
    }
  }

  # round z
  if (is.numeric(series[['z']])) {
    series[['z']] <- RoundFloat(series[['z']])
  }

  # sort by strata first and then by period, age
  series <-
    series[do.call(order, cbind(series[strata], series$y, series$x)),]

  # set attributes of series
  attr(series, which = 'class') <-
    c('lexisdata', 'data.frame')
  attr(series, which = 'series_key') <-
    paste(measure, paste0(strata, collapse = '_'), source, sep = '-')
  attr(series, which = 'measure_key') <-
    measure
  attr(series, which = 'strata_keys') <-
    strata
  attr(series, which = 'source_key') <-
    source
  attr(series, which = 'date_of_creation') <-
    strftime(Sys.time(), tz = 'UTC', usetz = TRUE)

  return(series)

}

print.lexisdata <- function (lexisdata) {
  N = nrow(lexisdata)
  n_na = sum(is.na(lexisdata[['z']]))
  cat(
    attr(lexisdata, 'series_key'), '\n',
    formatC(N, format = 'd', big.mark = ','), ' lexis cells', '\n',
    n_na, ' NAs in z variable', '\n',
    'Created on ', attr(lexisdata, 'date_of_creation'),
    sep = ''
  )
}

ValidateLexisdata <- function (lexisdata) {

  stopifnot(
    'Object is not of class "lexisdata"' =
      'lexisdata' %in% class(lexisdata),
    'Object is not of class "data.frame"' =
      'data.frame' %in% class(lexisdata),
    'Data frame does not start with z, x, y, wx, wy columns' =
      colnames(lexisdata)[1:5] == c('z', 'x', 'y', 'wx', 'wy'),
    'Object has NAs in key variables (x, y, wx, wy, strata)' =
      !any(sapply(lexisdata[-1], anyNA)),
    'Object features infinite value' =
      !any(sapply(lexisdata, is.infinite)),
    'Object features NaN value' =
      !any(sapply(lexisdata, is.nan))
  )

}

ExportLexisdata <- function (lexisdata, path) {

  filename <- paste0(attr(lexisdata, 'series_key'), '.csv')

  write.table(
    lexisdata, file = paste0(path, filename),
    sep = ',', eol = '\n', na = '.', dec = '.',
    row.names = FALSE, col.names = TRUE, fileEncoding = 'UTF-8'
  )

}

ConstructValidateExportLexisdata <- function (
    df,
    z, x, y, wx, wy, strata,
    measure, source,
    path
) {

  series <- ConstructLexisdata(df, z, x, y, wx, wy, strata, measure, source)
  ValidateLexisdata(series)
  ExportLexisdata(series, path)

  cat('Exported', attr(series, 'series_key'), 'to', path,  '\n')

}

RoundFloat <- function (x) {
  signif(x, digits = 6)
}
