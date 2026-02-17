# Download HMD mortality data

# Init --------------------------------------------------------------------

library(yaml)
library(HMDHFDplus)
library(qs)

# Constants ---------------------------------------------------------------

# input and output paths
paths <- list()
paths$input <- list(
  hfdcodes.cvs = "./src/data_aquisition/hfd/hfdcodes.csv",
  secrets.yml = "./cfg/secrets.yml"
)
paths$output <- list(
  births_period_by_age.qs = "./dat/hfd/births_period_by_age.qs",
  birthrates_period_by_age.qs = "./dat/hfd/fertilityrates_period_by_age.qs"
)

# constants specific to this analysis
cnst <- within(list(), {
  hfdcodes <- read.csv(paths$input$hfdcodes.cvs)
})

secrets <- read_yaml(paths$input$secrets.yml)

# create hfd codebook
# data.frame(
#   name = getHFDcountries()[["Country"]],
#   hfdcode = getHFDcountries()[["CNTRY"]],
#   iso3 = countrycode::countryname(getHFDcountries()[["Country"]],
#     destination = "iso2c"
#   )
# ) |>
#   write.csv("src/data_aquisition/hfd/hfdcodes.csv")

# Download birth counts ---------------------------------------------------

births_period_by_age <- lapply(cnst$hfdcodes$hfdcode, function(x) {
  cat(x, "\n")
  X <- readHFDweb(
    CNTRY = x, item = "birthsRR",
    username = secrets$hfd$user,
    password = secrets$hfd$password
  )
  data.frame(
    X,
    hfdcode = x,
    isocode = cnst$hfdcodes$iso3[cnst$hfdcodes$hfdcode == x]
  )
})

# Download birth rates ----------------------------------------------------

birthrates_period_by_age <- lapply(cnst$hfdcodes$hfdcode, function(x) {
  cat(x, "\n")
  X <- readHFDweb(
    CNTRY = x, item = "asfrRR",
    username = secrets$hfd$user,
    password = secrets$hfd$password
  )
  data.frame(
    X,
    hfdcode = x,
    isocode = cnst$hfdcodes$iso3[cnst$hfdcodes$hfdcode == x]
  )
})

# Export ------------------------------------------------------------------

# export results of analysis
qsave(births_period_by_age, paths$output$births_period_by_age.qs)
qsave(birthrates_period_by_age, paths$output$birthrates_period_by_age.qs)
