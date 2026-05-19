# Create Series

# Init --------------------------------------------------------------------

library(yaml)
library(qs2)
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
  series_input.qs =
    paste0("./dat/", cnst$source_key, "/abramsetal2026.qs")
)
paths$output <- list(
  series_output.csv =
    "./out/series_creation/percentannualmortalitychange-cod_sex-abramsetal2026.csv"
)

# Functions ---------------------------------------------------------------

RoundFloat <- function (x) {
  signif(x, digits = 6)
}

# Load series input -------------------------------------------------------

series_input <- qs_read(paths$input$series_input.qs)

# Create series -----------------------------------------------------------

series_output <-
  series_input |>
  # first and last year don't have percent change
  filter(!Year %in% c(1979, 2020)) |>
  # somehow the signs were flipped, turn % mortality improvements
  # into % mortality change
  mutate(Mx_change_year = -Mx_change_year) |>
  # code sex
  mutate(
    sex = case_when(
      sex == 'f' ~ 'Female',
      sex == 'm' ~ 'Male'
    )
  ) |>
  mutate(
    wx = 1,
    wy = 1
  ) |>
  select(
    z = Mx_change_year,
    x = Year,
    y = Age,
    wx,
    wy,
    codabramsetal2026 = cause,
    sex = sex
  ) |>
  mutate(across(where(is.factor), as.character)) |>
  mutate(across(c(x, y, wx, wy), as.integer)) |>
  mutate(across(c(z), RoundFloat)) |>
  filter(
    !is.na(sex) & !is.na(codabramsetal2026)
  ) |>
  arrange(
    sex, codabramsetal2026, x, y
  )

# Test --------------------------------------------------------------------

#series_input |> mutate(y2 = Year %/% 2) |> group_by(y2, Age, Cause, sex) |> mutate(m1 = Mx[which.min(Year)], m2 = Mx[which.max(Year)]) |> ungroup() |> mutate(p = (m2-m1)/m1*100) |> filter(Year == 1980)

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = series_output,
  file = paths$output$series_output.csv,
  na = "."
)
