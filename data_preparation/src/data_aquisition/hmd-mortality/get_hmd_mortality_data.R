# Download HMD mortality data

# Init --------------------------------------------------------------------

library(yaml)
library(HMDHFDplus)
library(qs)

# Constants ---------------------------------------------------------------

# input and output paths
paths <- list()
paths$input <- list(
  hmdcodes.cvs = "./src/data_aquisition/hmd-mortality/hmdcodes.csv",
  secrets.yml = "./cfg/secrets.yml"
)
paths$output <- list(
  deaths_period_by_age.qs = "./dat/hmd-mortality/deaths_period_by_age.qs",
  deathrates_period_by_age.qs = "./dat/hmd-mortality/deathrates_period_by_age.qs"
)

# constants specific to this analysis
cnst <- within(list(), {
  hmdcodes <- read.csv(paths$input$hmdcodes.cvs)
})

secrets <- read_yaml(paths$input$secrets.yml)

# create hmd codebook
# data.frame(
#   name = getHMDcountries()[["Country"]],
#   hmdcode = getHMDcountries()[["CNTRY"]],
#   iso3 = countrycode::countryname(getHMDcountries()[["Country"]],
#     destination = "iso2c"
#   )
# ) |>
#   write.csv("src/data_aquisition/hmd-mortality/mortality.csv")

# Download death counts ---------------------------------------------------

deaths_period_by_age <- lapply(cnst$hmdcodes$hmdcode, function(x) {
  cat(x, "\n")
  X <- readHMDweb(
    CNTRY = x, item = "Deaths_1x1",
    username = secrets$hmd$user,
    password = secrets$hmd$password
  )
  data.frame(
    X,
    hmdcode = x,
    isocode = cnst$hmdcodes$iso3[cnst$hmdcodes$hmdcode == x],
    subpopulation = cnst$hmdcodes$subpopulation[cnst$hmdcodes$hmdcode == x]
  )
})


# Download death rates ----------------------------------------------------

deathrates_period_by_age <- lapply(cnst$hmdcodes$hmdcode, function(x) {
  cat(x, "\n")
  X <- readHMDweb(
    CNTRY = x, item = "Mx_1x1",
    username = secrets$hmd$user,
    password = secrets$hmd$password
  )
  data.frame(
    X,
    hmdcode = x,
    isocode = cnst$hmdcodes$iso3[cnst$hmdcodes$hmdcode == x],
    subpopulation = cnst$hmdcodes$subpopulation[cnst$hmdcodes$hmdcode == x]
  )
})

# Download life tables ----------------------------------------------------

# Export ------------------------------------------------------------------

# export results of analysis
qsave(deaths_period_by_age, paths$output$deaths_period_by_age.qs)
qsave(deathrates_period_by_age, paths$output$deathrates_period_by_age.qs)
