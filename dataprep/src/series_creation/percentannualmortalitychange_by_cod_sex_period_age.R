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
  abramsetal2026.qs =
    paste0("./dat/", cnst$source_key, "/abramsetal2026.qs")
)
paths$output <- list(
  percentannualmortalitychange_by_cod_sex_period_age.csv =
    "./out/series_creation/percentannualmortalitychange_by_cod_sex_period_age.csv"
)

# Functions ---------------------------------------------------------------

RoundFloat <- function (x) {
  signif(x, digits = 6)
}

# Load series input -------------------------------------------------------

abramsetal2026.qs <- qs_read(paths$input$abramsetal2026.qs)

# Create series -----------------------------------------------------------

percentannualmortalitychange_by_cod_sex_period_age.csv <-
  abramsetal2026.qs |>
  # first and last year don't have percent change
  filter(!Year %in% c(1979, 2020)) |>
  # somehow the signs were flipped, turn % mortality improvements
  # into % mortality change
  mutate(Mx_change_year = -Mx_change_year) |>
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
    codabramsetal2026 = Cause,
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

#abramsetal2026.qs |> mutate(y2 = Year %/% 2) |> group_by(y2, Age, Cause, sex) |> mutate(m1 = Mx[which.min(Year)], m2 = Mx[which.max(Year)]) |> ungroup() |> mutate(p = (m2-m1)/m1*100) |> filter(Year == 1980)

# Export ------------------------------------------------------------------

# export results of analysis
write_csv(
  x = percentannualmortalitychange_by_cod_sex_period_age.csv,
  file = paths$output$percentannualmortalitychange_by_cod_sex_period_age.csv,
  na = "."
)
