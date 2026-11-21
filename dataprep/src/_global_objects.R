# Global constants and functions
#
# Shared helpers for series creation scripts. Scripts are run with the
# dataprep/ folder as working directory. The demoscapes import metadata
# (series.yml, measures.yml, strata/*.yml) is the single source of truth for
# series keys, measures, and strata; series scripts only name their series key.
#
# Typical use at the end of a series creation script:
#
#   ConstructValidateExportLexisdata(
#     series_output,
#     series_key = 'deathrate-region_sex_subpopulation-hmd',
#     path = './out/series_creation'
#   )
#
# Only base R and the yaml package are required.

# Constants ---------------------------------------------------------------

# location of the demoscapes import metadata relative to dataprep/
METADATA_DIR <- '../database/import/metadata'

# Metadata ----------------------------------------------------------------

# Read series, measure, and strata definitions from the import metadata.
# Returns a list with named lists `series`, `measures`, and `strata`, each
# keyed by the entries' `key` field.
ReadMetadata <- function (metadata_dir = METADATA_DIR) {

  if (!dir.exists(metadata_dir)) {
    stop(
      'Metadata directory not found: ', metadata_dir, '\n',
      'Run scripts with the dataprep/ folder as working directory.',
      call. = FALSE
    )
  }

  KeyBy <- function (entries) {
    entries <- Filter(function (e) !is.null(e[['key']]), entries)
    names(entries) <- vapply(entries, function (e) as.character(e[['key']]), '')
    entries
  }

  series_doc <- yaml::read_yaml(file.path(metadata_dir, 'series.yml'))
  measures_doc <- yaml::read_yaml(file.path(metadata_dir, 'measures.yml'))

  # each strata file holds either a single definition or a list of them
  strata_files <- list.files(
    file.path(metadata_dir, 'strata'), pattern = '\\.yml$', full.names = TRUE
  )
  strata <- unlist(lapply(strata_files, function (f) {
    doc <- yaml::read_yaml(f)
    if (!is.null(doc[['key']])) list(doc) else doc
  }), recursive = FALSE)

  list(
    series = KeyBy(series_doc[['series']]),
    measures = KeyBy(measures_doc[['measures']]),
    strata = KeyBy(strata)
  )

}

# Look up a series definition by key; fails with suggestions if unknown.
GetSeriesDefinition <- function (series_key, metadata = ReadMetadata()) {

  definition <- metadata$series[[series_key]]
  if (is.null(definition)) {
    candidates <- agrep(series_key, names(metadata$series), value = TRUE)
    stop(
      'Series key "', series_key, '" is not defined in series.yml.',
      if (length(candidates) > 0) {
        paste0('\nDid you mean: ', paste0('"', candidates, '"', collapse = ', '))
      },
      call. = FALSE
    )
  }
  definition

}

# Construct ---------------------------------------------------------------

# Bring a data frame into the lexisdata format expected by the importer.
#
# df          data frame with the series data
# series_key  key of the series as defined in series.yml
# z, x, y,
# wx, wy      names of the columns holding cell value, x and y coordinate,
#             and the x and y cell widths
# strata      optional mapping from strata keys to column names in df, e.g.
#             c(modelcarollo2025 = 'model'); strata keys not mentioned are
#             expected as columns of the same name
#
# Measure, source, and strata keys are taken from series.yml. Strata columns
# are converted to character, z is rounded for numeric measures and converted
# to trimmed character for categorical measures, and rows are sorted by
# strata, then y, then x.
ConstructLexisdata <- function (
    df, series_key,
    z = 'z', x = 'x', y = 'y', wx = 'wx', wy = 'wy',
    strata = NULL,
    metadata = ReadMetadata()
) {

  definition <- GetSeriesDefinition(series_key, metadata)
  strata_keys <- as.character(unlist(definition[['strataKeys']]))
  measure_key <- definition[['measureKey']]
  measure <- metadata$measures[[measure_key]]
  if (is.null(measure)) {
    stop('Measure "', measure_key, '" of series "', series_key,
         '" is not defined in measures.yml.', call. = FALSE)
  }

  # map strata keys to columns of df
  strata_columns <- setNames(strata_keys, strata_keys)
  if (!is.null(strata)) {
    unknown_keys <- setdiff(names(strata), strata_keys)
    if (length(unknown_keys) > 0) {
      stop('Strata mapping names unknown strata keys: ',
           paste(unknown_keys, collapse = ', '),
           '. Series "', series_key, '" declares: ',
           if (length(strata_keys) > 0) paste(strata_keys, collapse = ', ') else 'none',
           call. = FALSE)
    }
    strata_columns[names(strata)] <- strata
  }

  required_columns <- c(z, x, y, wx, wy, unname(strata_columns))
  missing_columns <- setdiff(required_columns, colnames(df))
  if (length(missing_columns) > 0) {
    stop('Input data lacks columns: ', paste(missing_columns, collapse = ', '),
         call. = FALSE)
  }

  df <- as.data.frame(df)

  # z according to the statistic type of the measure
  z_values <- df[[z]]
  if (identical(measure[['statType']], 'categorical')) {
    z_values <- trimws(as.character(z_values))
    z_values[z_values == ''] <- NA
  } else {
    if (!is.numeric(z_values)) {
      stop('z column "', z, '" must be numeric for measure "', measure_key,
           '" (statType ', measure[['statType']], ').', call. = FALSE)
    }
    z_values <- RoundFloat(z_values)
  }

  series <- data.frame(
    z = z_values,
    x = df[[x]],
    y = df[[y]],
    wx = df[[wx]],
    wy = df[[wy]],
    stringsAsFactors = FALSE
  )
  for (key in strata_keys) {
    series[[key]] <- as.character(df[[strata_columns[[key]]]])
  }

  # sort by strata first and then by y and x
  sort_columns <- c(unname(as.list(series[strata_keys])), list(series$y, series$x))
  series <- series[do.call(order, sort_columns), , drop = FALSE]
  rownames(series) <- NULL

  structure(
    series,
    class = c('lexisdata', 'data.frame'),
    series_key = series_key,
    measure_key = measure_key,
    strata_keys = strata_keys,
    source_keys = as.character(unlist(definition[['sourceKeys']])),
    stat_type = measure[['statType']],
    date_of_creation = strftime(Sys.time(), tz = 'UTC', usetz = TRUE)
  )

}

print.lexisdata <- function (x, n = 6, ...) {
  cat(
    attr(x, 'series_key'), '\n',
    formatC(nrow(x), format = 'd', big.mark = ','), ' lexis cells', '\n',
    sum(is.na(x[['z']])), ' NAs in z variable', '\n',
    'Created on ', attr(x, 'date_of_creation'), '\n',
    sep = ''
  )
  if (n > 0 && nrow(x) > 0) {
    print(utils::head(structure(x, class = 'data.frame'), n), ...)
  }
  invisible(x)
}

# Validate ----------------------------------------------------------------

# Check a lexisdata object against the import metadata. Collects all problems
# and fails with a single message listing them. Returns TRUE invisibly.
ValidateLexisdata <- function (lexisdata, metadata = ReadMetadata()) {

  problems <- character(0)
  Check <- function (ok, message) {
    if (!isTRUE(ok)) problems <<- c(problems, message)
  }
  Examples <- function (values, n = 5) {
    values <- unique(values)
    paste0(
      paste0('"', utils::head(values, n), '"', collapse = ', '),
      if (length(values) > n) paste0(' (and ', length(values) - n, ' more)')
    )
  }

  if (!inherits(lexisdata, 'lexisdata')) {
    stop('Object is not of class "lexisdata"; create it with ConstructLexisdata().',
         call. = FALSE)
  }

  series_key <- attr(lexisdata, 'series_key')
  definition <- GetSeriesDefinition(series_key, metadata)
  strata_keys <- as.character(unlist(definition[['strataKeys']]))
  measure <- metadata$measures[[definition[['measureKey']]]]

  # structure
  expected_columns <- c('z', 'x', 'y', 'wx', 'wy', strata_keys)
  Check(
    identical(colnames(lexisdata), expected_columns),
    paste0('Columns are [', paste(colnames(lexisdata), collapse = ', '),
           '] but series.yml requires [', paste(expected_columns, collapse = ', '), ']')
  )
  Check(nrow(lexisdata) > 0, 'Series has no rows')
  Check(
    identical(attr(lexisdata, 'measure_key'), definition[['measureKey']]),
    'measure_key attribute does not match series.yml'
  )
  Check(!is.null(measure), paste0('Measure "', definition[['measureKey']],
                                  '" is not defined in measures.yml'))

  if (length(problems) == 0 && nrow(lexisdata) > 0) {

    # coordinates and widths
    for (column in c('x', 'y', 'wx', 'wy')) {
      values <- lexisdata[[column]]
      Check(is.numeric(values), paste0(column, ' is not numeric'))
      if (is.numeric(values)) {
        Check(!anyNA(values), paste0(column, ' has ', sum(is.na(values)), ' missing values'))
        Check(all(is.finite(values[!is.na(values)])),
              paste0(column, ' has infinite or NaN values'))
      }
    }
    for (column in c('wx', 'wy')) {
      values <- lexisdata[[column]]
      if (is.numeric(values)) {
        Check(all(values[is.finite(values)] > 0),
              paste0(column, ' has values <= 0'))
      }
    }

    # cell values
    z <- lexisdata[['z']]
    if (identical(measure[['statType']], 'categorical')) {
      Check(is.character(z), 'z must be character for a categorical measure')
      domain <- trimws(as.character(unlist(measure[['display']][['colorDomain']])))
      unknown <- setdiff(z[!is.na(z)], domain)
      Check(
        length(unknown) == 0,
        paste0('z has categories missing from the colorDomain of measure "',
               measure[['key']], '": ', Examples(unknown))
      )
    } else {
      Check(is.numeric(z), 'z must be numeric for a numeric measure')
      if (is.numeric(z)) {
        Check(!any(is.nan(z)), 'z has NaN values (use NA for missing values)')
        # the importer reads "Inf" but not "-Inf"
        Check(!any(z == -Inf, na.rm = TRUE), 'z has -Inf values, which the importer cannot read')
      }
    }

    # strata values and codebooks
    for (key in strata_keys) {
      values <- lexisdata[[key]]
      Check(is.character(values), paste0('Strata column ', key, ' is not character'))
      Check(!anyNA(values) && all(trimws(values) != ''),
            paste0('Strata column ', key, ' has missing or empty values'))
      strata_definition <- metadata$strata[[key]]
      if (is.null(strata_definition)) {
        problems <- c(problems, paste0('Strata key "', key, '" has no definition in strata/*.yml'))
        next
      }
      codebook_keys <- vapply(
        strata_definition[['codebook']], function (e) as.character(e[['key']]), ''
      )
      if (!isTRUE(strata_definition[['valuesFromData']]) && length(codebook_keys) > 0) {
        unknown <- setdiff(values, codebook_keys)
        Check(length(unknown) == 0,
              paste0('Strata column ', key, ' has values missing from its codebook: ',
                     Examples(unknown)))
      }
    }

    # one cell per position and strata combination
    duplicated_cells <- duplicated(lexisdata[c('x', 'y', strata_keys)])
    Check(
      !any(duplicated_cells),
      paste0(sum(duplicated_cells), ' duplicated cells (same x, y, and strata), e.g. x = ',
             lexisdata$x[which(duplicated_cells)[1]], ', y = ',
             lexisdata$y[which(duplicated_cells)[1]])
    )

    # default strata must exist in the data
    default_strata <- definition[['defaultStrata']]
    if (length(default_strata) > 0) {
      unknown_keys <- setdiff(names(default_strata), strata_keys)
      Check(length(unknown_keys) == 0,
            paste0('defaultStrata uses undeclared strata keys: ',
                   paste(unknown_keys, collapse = ', ')))
      default_keys <- intersect(names(default_strata), strata_keys)
      if (length(default_keys) > 0) {
        matches <- Reduce(`&`, lapply(default_keys, function (key) {
          lexisdata[[key]] == as.character(default_strata[[key]])
        }))
        Check(any(matches),
              paste0('defaultStrata (', paste(default_keys, unlist(default_strata[default_keys]),
                                              sep = ' = ', collapse = ', '),
                     ') matches no rows'))
      }
    }

  }

  if (length(problems) > 0) {
    stop(
      'Validation of series "', series_key, '" failed:\n',
      paste0('  - ', problems, collapse = '\n'),
      call. = FALSE
    )
  }

  invisible(TRUE)

}

# Export ------------------------------------------------------------------

# Write a lexisdata object to <path>/<series_key>.csv. Missing values are
# written as "." as expected by the importer. Returns the file path invisibly.
ExportLexisdata <- function (lexisdata, path) {

  dir.create(path, showWarnings = FALSE, recursive = TRUE)
  file <- file.path(path, paste0(attr(lexisdata, 'series_key'), '.csv'))

  write.table(
    lexisdata, file = file,
    sep = ',', eol = '\n', na = '.', dec = '.',
    row.names = FALSE, col.names = TRUE, fileEncoding = 'UTF-8'
  )

  invisible(file)

}

ConstructValidateExportLexisdata <- function (
    df, series_key,
    z = 'z', x = 'x', y = 'y', wx = 'wx', wy = 'wy',
    strata = NULL,
    path,
    metadata = ReadMetadata()
) {

  series <- ConstructLexisdata(
    df, series_key, z = z, x = x, y = y, wx = wx, wy = wy,
    strata = strata, metadata = metadata
  )
  ValidateLexisdata(series, metadata)
  file <- ExportLexisdata(series, path)

  print(series, n = 0)
  cat('Exported to', file, '\n')

  invisible(series)

}

# Utilities ---------------------------------------------------------------

RoundFloat <- function (x) {
  signif(x, digits = 6)
}
