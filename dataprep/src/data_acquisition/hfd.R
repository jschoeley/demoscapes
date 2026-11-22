# Acquire data from the Human Fertility Database (HFD)
#
# Period birth counts and fertility rates by country, year, and age from
# https://www.humanfertility.org. Requires HFD credentials in cfg/secrets.yml
# (hfd: user, password). The countries to download and their ISO codes are
# listed under Constants.

# Init --------------------------------------------------------------------

here::i_am('src/data_acquisition/hfd.R'); setwd(here::here())

library(yaml)
library(qs2)
library(HMDHFDplus)

# Constants ---------------------------------------------------------------

# constants specific to this analysis
cnst <- within(list(), {
  source_key = 'hfd'
})

# input and output paths
paths <- list()
paths$input <- list(
  secrets.yml = 'cfg/secrets.yml'
)
paths$output <- list(
  source_dir = file.path('dat', cnst$source_key),
  births_period_by_age.qs = file.path('dat', cnst$source_key, 'births_period_by_age.qs'),
  fertilityrates_period_by_age.qs = file.path('dat', cnst$source_key, 'fertilityrates_period_by_age.qs')
)

dir.create(paths$output$source_dir, showWarnings = FALSE, recursive = TRUE)

secrets <- read_yaml(paths$input$secrets.yml)

# HFD countries to download, with the region code used by demoscapes
hfd_codes <- read.csv(text = '
name,hfdcode,isocode
Austria,AUT,AT
Belarus,BLR,BY
Belgium,BEL,BE
Bulgaria,BGR,BG
Canada,CAN,CA
Chile,CHL,CL
Croatia,HRV,HR
Czechia,CZE,CZ
Denmark,DNK,DK
Estonia,EST,EE
Finland,FIN,FI
France,FRATNP,FR
Germany,DEUTNP,DE
East Germany,DEUTE,DE-E
West Germany,DEUTW,DE-W
Hungary,HUN,HU
Iceland,ISL,IS
Ireland,IRL,IE
Italy,ITA,IT
Japan,JPN,JP
Lithuania,LTU,LT
Netherlands,NLD,NL
Norway,NOR,NO
Poland,POL,PL
Portugal,PRT,PT
Republic of Korea,KOR,KR
Russia,RUS,RU
Slovakia,SVK,SK
Slovenia,SVN,SI
Spain,ESP,ES
Sweden,SWE,SE
Switzerland,CHE,CH
Taiwan,TWN,TW
Ukraine,UKR,UA
U.K.,GBR_NP,GB
England and Wales,GBRTENW,GB-EAW
Northern Ireland,GBR_NIR,GB-NIR
Scotland,GBR_SCO,GB-SCT
U.S.A,USA,US
Greece,GRC,GR
Israel,ISR,IL
Latvia,LVA,LV
Luxembourg,LUX,LU
')

# The list was originally created with
# data.frame(
#   name = getHFDcountries()[['Country']],
#   hfdcode = getHFDcountries()[['CNTRY']],
#   isocode = countrycode::countryname(getHFDcountries()[['Country']],
#     destination = 'iso2c'
#   )
# ) |>
#   write.csv()
# and edited by hand. isocode holds ISO 3166-1 alpha-2 or ISO 3166-2 codes,
# matching the region codebook.

# Functions ---------------------------------------------------------------

# Download an HFD item for all countries in hfd_codes. Returns a list with one
# data frame per country.
DownloadHFDItem <- function (item) {
  lapply(hfd_codes$hfdcode, function (x) {
    cat(item, x, '\n')
    X <- readHFDweb(
      CNTRY = x, item = item,
      username = secrets$hfd$user,
      password = secrets$hfd$password
    )
    data.frame(
      X,
      hfdcode = x,
      isocode = hfd_codes$isocode[hfd_codes$hfdcode == x]
    )
  })
}

# Download ----------------------------------------------------------------

births_period_by_age <- DownloadHFDItem('birthsRR')
fertilityrates_period_by_age <- DownloadHFDItem('asfrRR')

# Export ------------------------------------------------------------------

qs_save(births_period_by_age, paths$output$births_period_by_age.qs)
qs_save(fertilityrates_period_by_age, paths$output$fertilityrates_period_by_age.qs)
